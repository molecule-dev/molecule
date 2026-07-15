# @molecule/api-esign-hellosign

HelloSign (Dropbox Sign) e-signature provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-esign-hellosign @molecule/api-bond @molecule/api-esign @molecule/api-secrets
```

## API

### Interfaces

#### `CreateSignatureRequestInput`

Input to {@link EsignProvider.createSignatureRequest}.

```typescript
interface CreateSignatureRequestInput {
    /** Human-readable title for the request, shown to signers. */
    title: string;
    /** Ordered list of signers. */
    signers: Signer[];
    /** The document to be signed. */
    document: EsignDocument;
    /** Optional list of CC email addresses that receive a copy on completion. */
    ccs?: string[];
    /** Optional message included in the signing invitation. */
    message?: string;
}
```

#### `EsignProvider`

Abstract e-signature provider interface. All vendor bonds (HelloSign /
Dropbox Sign, DocuSign, OpenSign, Adobe Sign, etc.) must implement this
interface so application code stays vendor-agnostic.

```typescript
interface EsignProvider {
    /**
     * Creates a new signature request. The document may be supplied as a raw
     * Buffer, a hosted URL, or a vendor template reference with prefill.
     *
     * @param input - Title, signers, document, and optional CC/message fields.
     * @returns The newly-created signature request, normalized.
     */
    createSignatureRequest(input: CreateSignatureRequestInput): Promise<SignatureRequest>;
    /**
     * Retrieves the current status of an existing signature request.
     *
     * @param id - Provider-issued signature request id.
     * @returns The current state of the signature request, normalized.
     */
    getSignatureRequest(id: string): Promise<SignatureRequest>;
    /**
     * Cancels a pending signature request. No-op for already-completed requests
     * (providers either return success or 4xx; this method normalizes to void).
     *
     * @param id - Provider-issued signature request id.
     */
    cancelSignatureRequest(id: string): Promise<void>;
    /**
     * Downloads the signed document (typically PDF) as a Buffer. Available
     * once the request status is `signed`.
     *
     * @param id - Provider-issued signature request id.
     * @returns The signed document bytes.
     */
    getSignedDocument(id: string): Promise<Buffer>;
    /**
     * Verifies and parses an inbound webhook callback from the provider.
     * Implementations MUST verify the request authenticity (e.g. via HMAC)
     * and throw on signature mismatch.
     *
     * @param headers - The HTTP request headers as a plain object.
     * @param body - The parsed JSON body of the webhook request.
     * @returns A normalized event describing what happened.
     */
    processWebhook(headers: Record<string, string | string[] | undefined>, body: unknown): Promise<EsignWebhookEvent>;
}
```

#### `EsignWebhookEvent`

Normalized webhook event produced by {@link EsignProvider.processWebhook}.

```typescript
interface EsignWebhookEvent {
    /** Type of the underlying event. */
    type: EsignWebhookEventType;
    /** Signature request id this event refers to. */
    signatureRequestId: string;
    /** Email of the signer involved, when applicable (e.g. signed / declined). */
    signerEmail?: string;
    /** The original provider payload, for diagnostic / audit purposes. */
    raw: unknown;
}
```

#### `SignatureRequest`

Normalized signature request returned by all `EsignProvider` methods.

```typescript
interface SignatureRequest {
    /** Provider-issued signature request id. */
    id: string;
    /** Aggregate status for the whole request. */
    status: SignatureRequestStatus;
    /** Per-signer breakdown including individual status and timestamp. */
    signers: SignerWithStatus[];
    /** ISO-8601 timestamp at which the request reached `signed` status. */
    signedAt?: string;
}
```

#### `Signer`

A signer participating in a signature request.

```typescript
interface Signer {
    /** Display name shown to the signer in invitations. */
    name: string;
    /** Email address used to deliver the signing invitation. */
    email: string;
    /** Optional role label (e.g. `'Tenant'`, `'Landlord'`). Some providers use this for template binding. */
    role?: string;
}
```

#### `SignerWithStatus`

A signer plus their current status within a signature request.

```typescript
interface SignerWithStatus extends Signer {
    /** Current status for this signer. */
    status: SignerStatus;
    /** ISO-8601 timestamp at which the signer signed, when applicable. */
    signedAt?: string;
}
```

### Types

#### `EsignDocument`

The document body for a new signature request. Three forms are supported:

1. A raw `Buffer` (uploaded via multipart upload by the provider).
2. A reference to an externally-hosted document via `{ url, filename? }`.
3. A reference to a vendor-side template via `{ templateId, prefill? }`,
   where `prefill` populates merge fields defined on the template.

```typescript
type EsignDocument = Buffer | {
    url: string;
    filename?: string;
} | {
    templateId: string;
    prefill?: Record<string, string | number | boolean>;
};
```

#### `EsignWebhookEventType`

Webhook event types normalized across providers.

```typescript
type EsignWebhookEventType = 'signature_request_signed' | 'signature_request_all_signed' | 'signature_request_declined' | 'signature_request_cancelled' | 'signature_request_expired' | 'unknown';
```

#### `SignatureRequestStatus`

Aggregate status for a signature request as a whole.

- `awaiting_signatures` — at least one signer has not yet signed
- `signed` — every signer has signed
- `declined` — at least one signer declined
- `cancelled` — request was cancelled by the requester
- `expired` — request window elapsed before completion

```typescript
type SignatureRequestStatus = 'awaiting_signatures' | 'signed' | 'declined' | 'cancelled' | 'expired';
```

#### `SignerStatus`

Per-signer status within a signature request.

- `pending` — invitation sent, awaiting action
- `signed` — signer has completed and signed
- `declined` — signer explicitly declined
- `expired` — signature window elapsed before action

```typescript
type SignerStatus = 'pending' | 'signed' | 'declined' | 'expired';
```

### Functions

#### `cancelSignatureRequest(id)`

Cancels a pending HelloSign signature request.

```typescript
function cancelSignatureRequest(id: string): Promise<void>
```

- `id` — HelloSign signature_request_id.

#### `createSignatureRequest(input)`

Creates a new signature request via HelloSign. Routes between three
endpoints depending on the document form:

- Buffer → `signature_request/send` (multipart)
- URL    → `signature_request/send` (JSON `file_url`)
- Template → `signature_request/send_with_template`

```typescript
function createSignatureRequest(input: CreateSignatureRequestInput): Promise<SignatureRequest>
```

- `input` — The signature request input.

**Returns:** The newly-created normalized signature request.

#### `getSignatureRequest(id)`

Retrieves the current state of a HelloSign signature request.

```typescript
function getSignatureRequest(id: string): Promise<SignatureRequest>
```

- `id` — HelloSign signature_request_id.

**Returns:** The normalized signature request.

#### `getSignedDocument(id)`

Downloads the signed PDF for a HelloSign signature request.

```typescript
function getSignedDocument(id: string): Promise<Buffer<ArrayBufferLike>>
```

- `id` — HelloSign signature_request_id.

**Returns:** The signed document bytes.

#### `processWebhook(_headers, body)`

Verifies and parses an inbound HelloSign webhook callback. The HelloSign
webhook payload arrives form-encoded with a single `json` field whose
value is the JSON body. The body contains `event.event_hash`, computed
as `hmac_sha256(api_key, event_time + event_type)`.

Implementations that pre-parse the form into `{ json: '...' }` should
pass the resulting object directly. The provider also tolerates a body
already shaped like the inner event payload.

```typescript
function processWebhook(_headers: Record<string, string | string[] | undefined>, body: unknown): Promise<EsignWebhookEvent>
```

- `_headers` — The HTTP request headers (unused; HelloSign places
- `body` — The parsed request body.

**Returns:** The normalized webhook event.

### Constants

#### `esignHellosignSecretDefinitions`

Secret definitions required by the Dropbox Sign (HelloSign) e-signature bond.

```typescript
const esignHellosignSecretDefinitions: SecretDefinition[]
```

#### `provider`

The HelloSign provider implementing the `EsignProvider` interface.

```typescript
const provider: EsignProvider
```

## Core Interface
Implements `@molecule/api-esign` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-esign'
import { provider } from '@molecule/api-esign-hellosign'

export function setupEsignHellosign(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-esign` ^1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `HELLOSIGN_API_KEY` *(required)* — Dropbox Sign (HelloSign) API key
  - Setup: Generate an API key in Dropbox Sign → Account settings → API.
  - Get it here: [https://app.hellosign.com/home/myAccount#api](https://app.hellosign.com/home/myAccount#api)

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-esign`
- `@molecule/api-secrets`
