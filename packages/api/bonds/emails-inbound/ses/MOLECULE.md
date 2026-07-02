# @molecule/api-emails-inbound-ses

AWS SES inbound-email provider for molecule.dev.

Implements `@molecule/api-emails-inbound`'s `InboundEmailProvider`
interface against AWS SES Inbound's SNS-delivery format. Validates SNS
notification signatures by fetching the publisher cert from a
`*.amazonaws.com`-allowlisted URL, parses the SES `mail` + `content`
fields, and decodes the embedded RFC 822 message via `mailparser`.

Outbound replies compose onto the bonded `@molecule/api-emails`
transport (typically `@molecule/api-emails-ses`) — this package does not
reimplement SMTP / SES SendEmail.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-emails-inbound'
import { provider as sesInbound } from '@molecule/api-emails-inbound-ses'

setProvider(sesInbound)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-emails-inbound-ses
```

## API

### Interfaces

#### `InboundEmail`

A normalized inbound email, produced by parsing a provider webhook
payload through {@link InboundEmailProvider.parseWebhookPayload}.

All providers (Mailgun Routes, SES Inbound, fixtures, etc.) return this
same shape so handler code can treat inbound mail uniformly. Provider
specifics (raw MIME, signing tokens, etc.) MUST NOT leak into this type.

```typescript
interface InboundEmail {
    /**
     * Stable provider-supplied identifier for the message. Used for
     * deduplication when the same webhook is retried.
     */
    id: string;
    /**
     * Sender address (RFC 5322 mailbox), e.g. `'alice@example.com'`.
     */
    from: string;
    /**
     * Primary recipient addresses (the values from the `To:` header).
     */
    to: string[];
    /**
     * Carbon-copy recipient addresses, if present.
     */
    cc?: string[];
    /**
     * Subject line, decoded to a plain string. May be empty.
     */
    subject: string;
    /**
     * Plain-text body of the message, if present.
     */
    textBody?: string;
    /**
     * HTML body of the message, if present.
     */
    htmlBody?: string;
    /**
     * Decoded attachments. An empty array when the message has none.
     */
    attachments?: InboundEmailAttachment[];
    /**
     * All headers from the raw message, lowercased keys to canonicalize the
     * many capitalizations that mail servers use. Multi-value headers
     * (`Received:`, etc.) are joined with newlines or returned as arrays at
     * provider discretion — see provider docs.
     */
    headers: Record<string, string | string[]>;
    /**
     * Server-side timestamp the inbound provider received the message.
     */
    receivedAt: Date;
    /**
     * Optional `Message-ID` header value for threading. Surfaced separately
     * from {@link headers} because helpdesk handlers almost always need it.
     */
    messageId?: string;
    /**
     * Optional `In-Reply-To` header value for threading replies into an
     * existing ticket.
     */
    inReplyTo?: string;
    /**
     * Optional `References` header values for threading.
     */
    references?: string[];
}
```

#### `InboundEmailAttachment`

A binary attachment carried by an inbound email.

Providers normalize whatever multipart/MIME representation they receive
into this neutral shape. The body is base64-encoded so the type is
JSON-serializable across IPC, queue, and webhook boundaries.

```typescript
interface InboundEmailAttachment {
    /**
     * The original filename as supplied by the sender, or a provider-derived
     * fallback when the sender omitted one.
     */
    name: string;
    /**
     * MIME type of the attachment (e.g. `'application/pdf'`, `'image/png'`).
     * Defaults to `'application/octet-stream'` when the provider cannot
     * determine the type.
     */
    contentType: string;
    /**
     * Attachment payload, base64-encoded.
     */
    contentBase64: string;
    /**
     * Optional size hint in bytes of the decoded payload. Providers MAY set
     * this from upstream headers without decoding the payload themselves.
     */
    sizeBytes?: number;
    /**
     * Optional Content-ID, used for inline images referenced from the HTML
     * body via `cid:` URLs.
     */
    contentId?: string;
}
```

#### `InboundEmailProvider`

Inbound-email provider interface.

Implementations (Mailgun Routes, SES Inbound, etc.) live in separate
bond packages (`@molecule/api-emails-inbound-mailgun-routes`,
`@molecule/api-emails-inbound-ses`). The interface is deliberately
minimal: a webhook arrives at the host application's HTTP layer, the
raw headers and body are handed to the provider, and the provider
returns a normalized {@link InboundEmail}.

Signature verification is mandatory for any provider that runs against
a public webhook endpoint; {@link verifySignature} is the hook for
that. Providers without signed webhooks SHOULD return `false` rather
than `true` so callers can decide whether to accept unsigned mail.

```typescript
interface InboundEmailProvider {
    /**
     * Parses the raw webhook payload (HTTP headers + body) into a
     * normalized {@link InboundEmail}.
     *
     * @param headers - HTTP request headers received by the webhook
     *   endpoint. Lowercased keys are recommended but not required;
     *   implementations MUST handle either casing.
     * @param body - Raw HTTP request body. May be a `Buffer` (e.g. from a
     *   raw body parser), a `string`, or an already-parsed object provided
     *   by an upstream JSON middleware.
     * @returns The normalized inbound email.
     */
    parseWebhookPayload(headers: Record<string, string | string[] | undefined>, body: Buffer | string | Record<string, unknown>): Promise<InboundEmail>;
    /**
     * Verifies the signature of a webhook request, using whatever scheme
     * the provider exposes (Mailgun HMAC, SES SNS subscription
     * confirmation, etc.). Implementations MUST be constant-time when
     * comparing secrets.
     *
     * @param headers - HTTP request headers received by the webhook
     *   endpoint.
     * @param body - Raw HTTP request body. Implementations that need the
     *   exact bytes (e.g. for HMAC) MUST be passed a `Buffer`.
     * @returns `true` when the signature is valid, `false` otherwise.
     */
    verifySignature(headers: Record<string, string | string[] | undefined>, body: Buffer | string): Promise<boolean>;
    /**
     * Optional: dispatches an outbound reply through the provider's own
     * reply mechanism. Providers that do not support reply dispatch (e.g.
     * pure inbound-only adapters) SHOULD omit this method; callers MUST
     * use {@link InboundEmailProvider.supportsReply} to detect support.
     *
     * @param email - The original inbound email being replied to.
     * @param reply - The reply payload.
     * @returns Result of the dispatch.
     */
    replyTo?(email: InboundEmail, reply: InboundEmailReply): Promise<InboundEmailReplyResult>;
    /**
     * Indicates whether the provider supports outbound reply dispatch via
     * {@link replyTo}. Implementations SHOULD return a stable `true` /
     * `false` based on their own configuration; the property is a function
     * so providers can defer to runtime configuration if needed.
     *
     * @returns `true` when {@link replyTo} is implemented and ready to use.
     */
    supportsReply(): boolean;
}
```

#### `InboundEmailReply`

Outgoing reply produced by handler code in response to an
{@link InboundEmail}. Providers that support the optional
{@link InboundEmailProvider.replyTo} method translate this into whatever
outbound mechanism their upstream offers (Mailgun reply route, SES
SendEmail, etc.).

For providers that do NOT expose an outbound reply path, handler code
SHOULD fall back to the regular `@molecule/api-emails` outbound bond.

```typescript
interface InboundEmailReply {
    /**
     * Subject line for the outbound reply. If omitted, providers SHOULD
     * default to the original subject prefixed with `'Re: '` (locale-aware
     * prefixing is the caller's responsibility).
     */
    subject?: string;
    /**
     * Plain-text body of the reply, if any.
     */
    textBody?: string;
    /**
     * HTML body of the reply, if any.
     */
    htmlBody?: string;
    /**
     * Attachments to send with the reply.
     */
    attachments?: InboundEmailAttachment[];
    /**
     * Optional override for the `From:` address. Defaults to the address
     * the original message was sent to (the inbound mailbox).
     */
    from?: string;
    /**
     * Optional additional headers to set on the outbound message.
     */
    headers?: Record<string, string>;
}
```

#### `InboundEmailReplyResult`

Result of a successful reply dispatch via
{@link InboundEmailProvider.replyTo}.

```typescript
interface InboundEmailReplyResult {
    /**
     * Provider-supplied identifier for the dispatched outbound message.
     */
    id: string;
}
```

#### `SesInboundNotificationMessage`

Shape of the JSON payload SES publishes to SNS for inbound-email
notifications. Only the fields used by this bond are typed; SES emits a
superset including `verdicts`, `dkim`, etc.

```typescript
interface SesInboundNotificationMessage {
  /** Notification kind. We expect `Received` for inbound mail. */
  notificationType: string

  /** Metadata about the SES `mail` object. */
  mail: {
    /** ISO timestamp SES received the message. */
    timestamp: string
    /** Sender as decoded by SES. */
    source: string
    /** SES-assigned message ID. */
    messageId: string
    /** Envelope-recipient list. */
    destination: string[]
    /** Common headers SES extracts from the message. */
    commonHeaders?: {
      from?: string[]
      to?: string[]
      cc?: string[]
      bcc?: string[]
      subject?: string
      messageId?: string
      inReplyTo?: string
      references?: string
    }
    /**
     * All raw headers SES extracted, when `headersTruncated` is `false`.
     */
    headers?: Array<{ name: string; value: string }>
  }

  /**
   * Raw RFC 822 message content, base64-encoded, present when the SES
   * receipt rule includes the message content. Absent for header-only
   * notifications.
   */
  content?: string
}
```

#### `SnsNotificationPayload`

Shape of an Amazon SNS notification (or SubscriptionConfirmation /
UnsubscribeConfirmation) payload, as POSTed to a subscribed HTTPS
endpoint. Only the fields used by this bond are typed here.

```typescript
interface SnsNotificationPayload {
  /**
   * Discriminates the kind of message: `Notification`,
   * `SubscriptionConfirmation`, or `UnsubscribeConfirmation`.
   */
  Type: string

  /** A unique UUID for the message. */
  MessageId: string

  /** The notification topic ARN. */
  TopicArn?: string

  /**
   * Subject line as supplied by the publisher. Optional for notifications.
   */
  Subject?: string

  /** Message payload (string). For SES notifications this is JSON. */
  Message: string

  /** ISO 8601 timestamp when the message was published. */
  Timestamp: string

  /** Signature version. AWS SNS supports `1` (SHA1) and `2` (SHA256). */
  SignatureVersion: string

  /** Base64-encoded signature over the canonical string. */
  Signature: string

  /** URL of the X.509 PEM cert used to sign the message. */
  SigningCertURL: string

  /** Confirmation token (only on SubscriptionConfirmation messages). */
  Token?: string

  /** Subscribe URL (only on SubscriptionConfirmation messages). */
  SubscribeURL?: string

  /** Unsubscribe URL (only on Notification / UnsubscribeConfirmation). */
  UnsubscribeURL?: string
}
```

### Functions

#### `_resetSigningCertCache()`

Resets the cached signing certificates. Exposed for tests.

```typescript
function _resetSigningCertCache(): void
```

#### `base64ToBuffer(value)`

Decodes a base64 string into a Node `Buffer`.

```typescript
function base64ToBuffer(value: string): Buffer<ArrayBufferLike>
```

- `value` — The base64 string.

**Returns:** The decoded buffer.

#### `bodyToString(body)`

Coerces the request body into a UTF-8 string. SNS POSTs JSON as UTF-8.

```typescript
function bodyToString(body: string | Buffer<ArrayBufferLike>): string
```

- `body` — The raw body.

**Returns:** The body as a UTF-8 string.

#### `buildSnsCanonicalString(payload)`

Builds the canonical string SNS signs for the supplied notification.
The exact field order is mandated by the SNS message-and-signature
format; the canonical string is built from key/value pairs separated by
`\n`, with a trailing `\n` after the last value.

```typescript
function buildSnsCanonicalString(payload: { Type?: string; Message?: string; MessageId?: string; Subject?: string; SubscribeURL?: string; Timestamp?: string; Token?: string; TopicArn?: string; }): string
```

- `payload` — The SNS notification payload.

**Returns:** The canonical string suitable for HMAC verification.

#### `getHeader(headers, name)`

Returns the value of `headers[name]` (case-insensitive) coerced to a
single string.

```typescript
function getHeader(headers: Record<string, string | string[] | undefined>, name: string): string | undefined
```

- `headers` — The headers object.
- `name` — The header name (case-insensitive).

**Returns:** The header value as a single string, or `undefined` if absent.

#### `getSigningCertHostnameSuffixes()`

Returns the configured allowlist of hostname suffixes for the SNS
`SigningCertURL`. Defaults to {@link SNS_SIGNING_CERT_HOSTNAME_SUFFIXES}
when the env override is unset.

```typescript
function getSigningCertHostnameSuffixes(): readonly string[]
```

**Returns:** The allowlist of hostname suffixes.

#### `headerToString(value)`

Coerces an HTTP header value (which may be `string`, `string[]`, or
`undefined`) to a single string. Multi-value headers are joined with
`, ` per RFC 9110 §5.2.

```typescript
function headerToString(value: string | string[] | undefined): string | undefined
```

- `value` — The header value to coerce.

**Returns:** The header value as a single string, or `undefined` when the
 *   header was not present.

#### `isAllowedSigningCertUrl(url)`

Validates that an SNS `SigningCertURL` is HTTPS and its hostname matches
an entry in the allowlist. Defends against SSRF and certificate
substitution attacks where an attacker tricks the verifier into fetching
a cert from a host they control.

```typescript
function isAllowedSigningCertUrl(url: string): boolean
```

- `url` — The candidate URL string.

**Returns:** `true` when the URL is acceptable.

#### `parseJsonBody(body)`

Parses a Buffer/string/object body as an SNS JSON payload. Throws
(caught by the caller) when the body is not valid JSON.

```typescript
function parseJsonBody(body: string | Buffer<ArrayBufferLike> | Record<string, unknown>): unknown
```

- `body` — The raw body.

**Returns:** The parsed object.

#### `parseRawMimeContent(raw, overrides)`

Parses a raw RFC 822 MIME message into a normalized {@link InboundEmail}.

Used internally by `parseWebhookPayload` after the SES `content` field
has been base64-decoded. Exposed so that applications using SES's
S3-only delivery mode can reuse the same parser by fetching the S3
object themselves and calling this helper.

```typescript
function parseRawMimeContent(raw: string | Buffer<ArrayBufferLike>, overrides?: Partial<InboundEmail>): Promise<InboundEmail>
```

- `raw` — The raw RFC 822 message bytes.
- `overrides` — Optional fields to override on the parsed result

**Returns:** The normalized inbound email.

#### `parseWebhookPayload(_headers, body)`

Parses an SNS notification carrying an SES inbound-email payload into a
normalized {@link InboundEmail}.

When the SES `Message.content` field is present, it is base64-decoded
and parsed as RFC 822 via `mailparser`. When `content` is absent
(header-only notifications), we synthesize an `InboundEmail` from the
SES `mail` metadata so the caller can still log/dedupe the message.

SubscriptionConfirmation messages are returned as a synthetic
`InboundEmail` whose `subject` is `'__sns:SubscriptionConfirmation'` and
whose `headers['x-sns-subscribe-url']` carries the confirmation URL —
applications inspect this so they can subscribe out-of-band.

```typescript
function parseWebhookPayload(_headers: Record<string, string | string[] | undefined>, body: string | Buffer<ArrayBufferLike> | Record<string, unknown>): Promise<InboundEmail>
```

- `_headers` — HTTP headers (unused).
- `body` — Raw HTTP body (SNS JSON).

**Returns:** The normalized inbound email.

#### `replyTo(email, reply)`

Dispatches an outbound reply through the bonded `@molecule/api-emails`
transport. The reply's `In-Reply-To` and `References` headers are
populated from the original message when present.

```typescript
function replyTo(email: InboundEmail, reply: InboundEmailReply): Promise<InboundEmailReplyResult>
```

- `email` — The original inbound email being replied to.
- `reply` — The reply payload.

**Returns:** The reply dispatch result.

#### `splitReferences(value)`

Splits a `References:` header (whitespace-separated `<message-id>`
tokens) into individual values, preserving the angle brackets.

```typescript
function splitReferences(value: string | undefined): string[]
```

- `value` — The raw header value.

**Returns:** Array of message-id tokens (with angle brackets) or empty.

#### `supportsReply()`

Indicates that this provider supports outbound reply dispatch via
{@link replyTo}. The reply path requires the outbound
`@molecule/api-emails` bond to be wired with a transport — typically
`@molecule/api-emails-ses`.

```typescript
function supportsReply(): boolean
```

**Returns:** Always `true`.

#### `unwrapMessageId(value)`

Strips surrounding angle brackets from a `Message-ID` value.

```typescript
function unwrapMessageId(value: string | undefined): string | undefined
```

- `value` — The raw value (with or without angle brackets).

**Returns:** The value without angle brackets, or `undefined` if input was empty.

#### `verifySignature(_headers, body)`

Verifies the signature of an SNS notification payload. Implements the
AWS SNS signature-verification flow:

1. Parse the JSON body.
2. Reject if `SigningCertURL` is not from an allowlisted host.
3. Fetch the X.509 certificate from `SigningCertURL`.
4. Build the canonical string per AWS docs (field order varies by
   `Type`).
5. Verify the base64-decoded `Signature` against the canonical string
   using SHA1 (`SignatureVersion === '1'`) or SHA256
   (`SignatureVersion === '2'`).
6. When `AWS_SES_INBOUND_TOPIC_ARN` is set, also verify the payload's
   `TopicArn` matches.

Errors NEVER leak signing material; failures simply return `false`.

```typescript
function verifySignature(_headers: Record<string, string | string[] | undefined>, body: string | Buffer<ArrayBufferLike>): Promise<boolean>
```

- `_headers` — HTTP headers (unused — SNS signs the body).
- `body` — Raw HTTP request body (JSON).

**Returns:** `true` when the signature is valid, `false` otherwise.

### Constants

#### `emailsInboundSesSecretDefinitions`

Secret definitions required by the AWS SES inbound-email bond.

```typescript
const emailsInboundSesSecretDefinitions: SecretDefinition[]
```

#### `provider`

The AWS SES inbound-email provider implementing the
{@link InboundEmailProvider} interface.

```typescript
const provider: InboundEmailProvider
```

#### `SNS_SIGNING_CERT_HOSTNAME_SUFFIXES`

Allowed hostname suffixes for the SNS `SigningCertURL`. AWS SNS only
publishes signing certificates from `*.amazonaws.com`; any URL outside
this allowlist MUST be rejected to defend against SSRF and certificate
substitution attacks.

Exposed for unit-testing; not part of the public bond surface.

```typescript
const SNS_SIGNING_CERT_HOSTNAME_SUFFIXES: readonly string[]
```

## Core Interface
Implements `@molecule/api-emails-inbound` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-emails-inbound'
import { provider } from '@molecule/api-emails-inbound-ses'

export function setupEmailsInboundSes(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-emails` ^1.0.0
- `@molecule/api-emails-inbound` ^1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `AWS_ACCESS_KEY_ID` *(required)* — AWS access key ID
  - Setup: Create an IAM user with the needed policy (SES/S3/SQS) and create an access key under Security credentials.
  - Get it here: [https://console.aws.amazon.com/iam/](https://console.aws.amazon.com/iam/)
  - Example: `AKIA...`
- `AWS_SECRET_ACCESS_KEY` *(required)* — AWS secret access key
  - Setup: Shown once when creating the IAM access key — store it immediately.
  - Get it here: [https://console.aws.amazon.com/iam/](https://console.aws.amazon.com/iam/)
- `AWS_SES_REGION` *(required)* — AWS SES region
  - Setup: The AWS region where SES is set up (and out of sandbox for production sending).
  - Example: `us-east-1`
- `AWS_SES_INBOUND_TOPIC_ARN` *(optional)* — SES inbound SNS topic ARN
  - Setup: ARN of the SNS topic your SES receipt rule publishes inbound mail to.
  - Get it here: [https://console.aws.amazon.com/ses/](https://console.aws.amazon.com/ses/)
  - Example: `arn:aws:sns:us-east-1:123456789012:ses-inbound`
- `AWS_SNS_SIGNING_CERT_HOSTNAME_SUFFIXES` *(optional)* — SNS signing-cert hostname allowlist — default: `.amazonaws.com`
  - Setup: Comma-separated hostname suffixes allowed for SNS signature certificates; the default (.amazonaws.com) is fine.
  - Example: `.amazonaws.com`
