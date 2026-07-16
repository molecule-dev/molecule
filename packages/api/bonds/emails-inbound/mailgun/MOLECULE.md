# @molecule/api-emails-inbound-mailgun

Mailgun Routes inbound-email provider for molecule.dev.

Implements `@molecule/api-emails-inbound`'s `InboundEmailProvider`
interface against Mailgun's parsed-email POST format. Verifies the
`timestamp`/`token`/`signature` triple via HMAC-SHA256 against
`MAILGUN_API_KEY`, rejecting payloads older than the configured replay
window.

Outbound replies compose onto the bonded `@molecule/api-emails`
transport (typically `@molecule/api-emails-mailgun`) — this package does
not reimplement the SMTP path.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-emails-inbound'
import { provider as mailgunRoutes } from '@molecule/api-emails-inbound-mailgun'

setProvider(mailgunRoutes)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-emails-inbound-mailgun @molecule/api-emails @molecule/api-emails-inbound @molecule/api-secrets
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
     * A genuinely invalid webhook (forged, stale, malformed, tampered
     * signature) resolves `false` — that is the normal, expected failure
     * path and callers map it to a `401`. Implementations MAY instead THROW
     * a tagged configuration error (e.g. via `configNotConfiguredError()`
     * from `@molecule/api-secrets`) when the provider itself is
     * misconfigured — for example a missing signing key/secret. This is a
     * DISTINCT failure class from a `false` return: a misconfigured server
     * is not the same problem as a forged request, and collapsing both into
     * the same `false` makes a broken deployment indistinguishable from an
     * attack, with no trace either way. `@molecule/api-emails-inbound-mailgun`
     * follows this pattern — `verifySignature` throws the tagged
     * `config.notConfigured` error when `MAILGUN_API_KEY` is unset, and
     * resolves `false` for every other verification failure.
     *
     * @param headers - HTTP request headers received by the webhook
     *   endpoint.
     * @param body - Raw HTTP request body. Implementations that need the
     *   exact bytes (e.g. for HMAC) MUST be passed a `Buffer`.
     * @returns `true` when the signature is valid, `false` for an
     *   invalid/forged/stale/malformed webhook.
     * @throws {Error} Implementations MAY throw a tagged configuration error
     *   when the provider is missing required configuration (e.g. an unset
     *   signing key) — a server misconfiguration, not an invalid request.
     * @example
     * ```typescript
     * // In an HTTP handler bound to the inbound webhook URL:
     * const ok = await verifySignature(req.headers, req.rawBody)
     * if (!ok) return res.status(401).end()
     * // A thrown configuration error (server misconfigured) is deliberately
     * // NOT caught above — do not wrap this call in a try/catch that maps
     * // every failure to the same 401. Let it propagate to standard error
     * // middleware, which maps a tagged config error to a 503, distinct
     * // from the 401 an invalid/forged webhook gets.
     * ```
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

### Functions

#### `parseWebhookPayload(_headers, body)`

Parses a Mailgun Routes inbound webhook payload into a normalized
{@link InboundEmail}.

Mailgun POSTs `application/x-www-form-urlencoded` data with keys such as
`From`, `To`, `Cc`, `subject`, `body-plain`, `body-html`, `Message-Id`,
`In-Reply-To`, `References`, `attachment-count`, `attachment-N`, plus
the signing triple. We only extract domain-relevant fields here;
verification is done separately by {@link verifySignature}.

When `Message-Id` is absent, `id` falls back to
{@link deriveStableFallbackId} rather than the per-request signing
`token` — see that function's docs for why.

```typescript
function parseWebhookPayload(_headers: Record<string, string | string[] | undefined>, body: string | Buffer<ArrayBufferLike> | Record<string, unknown>): Promise<InboundEmail>
```

- `_headers` — HTTP headers (unused — Mailgun puts everything in the body).
- `body` — The raw form-encoded body, a string, or an already-parsed object.

**Returns:** The normalized inbound email.

#### `replyTo(email, reply)`

Dispatches an outbound reply through the bonded `@molecule/api-emails`
transport. Mailgun's outbound API is already exposed via
`@molecule/api-emails-mailgun`, so we compose rather than reimplement.

The reply's `In-Reply-To` and `References` headers are populated from
the original message when present, so threading works in the recipient's
mail client.

```typescript
function replyTo(email: InboundEmail, reply: InboundEmailReply): Promise<InboundEmailReplyResult>
```

- `email` — The original inbound email being replied to.
- `reply` — The reply payload.

**Returns:** The reply dispatch result.

#### `supportsReply()`

Indicates that this provider supports outbound reply dispatch via
{@link replyTo}. The reply path requires the outbound
`@molecule/api-emails` bond to be wired with a transport — typically
`@molecule/api-emails-mailgun`.

```typescript
function supportsReply(): boolean
```

**Returns:** Always `true`.

#### `verifySignature(_headers, body)`

Verifies a Mailgun inbound webhook signature. Mailgun computes the
signature as `HMAC-SHA256(key=api_key, msg=timestamp + token)`, where
`+` is string concatenation (no separator). Implementations MUST be
constant-time and MUST reject stale timestamps.

The `body` parameter is the raw form-encoded body that carries the
signing fields. Header-only signing schemes are not supported by Mailgun
Routes.

Distinguishes SERVER MISCONFIGURATION from a genuinely invalid webhook:
an unset `MAILGUN_API_KEY` THROWS the tagged `config.notConfigured` error
(mapped by the API error middleware to a clean 503) instead of returning
`false`. Stale timestamps, missing signing fields, and a tampered
signature all still resolve to `false` (401) — those ARE the "this
request is not from Mailgun" class. Collapsing every failure mode into
the same `false` made a misconfigured server indistinguishable from
active forgery, with no trace either way (see
integration-audit-findings.md → [email] ambiguous-failure).

```typescript
function verifySignature(_headers: Record<string, string | string[] | undefined>, body: string | Buffer<ArrayBufferLike>): Promise<boolean>
```

- `_headers` — HTTP headers (unused — Mailgun signs via form fields).
- `body` — Raw HTTP request body (form-encoded).

**Returns:** `true` when the signature verifies and the timestamp is fresh;
 *   `false` for a malformed/stale/forged webhook.

### Constants

#### `mailgunInboundSecretDefinitions`

Secret definitions required by the Mailgun inbound-email bond.

```typescript
const mailgunInboundSecretDefinitions: SecretDefinition[]
```

#### `provider`

The Mailgun Routes inbound-email provider implementing the
{@link InboundEmailProvider} interface.

```typescript
const provider: InboundEmailProvider
```

## Core Interface
Implements `@molecule/api-emails-inbound` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-emails-inbound'
import { provider } from '@molecule/api-emails-inbound-mailgun'

export function setupEmailsInboundMailgun(): void {
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

- `MAILGUN_API_KEY` *(required)* — Mailgun API key
  - Setup: Mailgun dashboard → Settings → API Security → create/copy a sending API key.
  - Get it here: [https://app.mailgun.com/settings/api_security](https://app.mailgun.com/settings/api_security)
- `MAILGUN_DOMAIN` *(required)* — Mailgun sending domain
  - Setup: Add and verify a sending domain in Mailgun (sandbox domains work for testing to authorized recipients).
  - Get it here: [https://app.mailgun.com/mg/sending/domains](https://app.mailgun.com/mg/sending/domains)
  - Example: `mg.example.com`
- `MAILGUN_INBOUND_REPLAY_WINDOW_SECONDS` *(optional)* — Mailgun inbound replay window
  - Setup: Max age (seconds) of accepted inbound webhook signatures — replay protection; the default is fine.
  - Example: `300`

### Runtime Dependencies

- `@molecule/api-emails`
- `@molecule/api-emails-inbound`
- `@molecule/api-secrets`

`verifySignature` THROWS the tagged `config.notConfigured` error (→ 503
via the API error middleware) when `MAILGUN_API_KEY` is unset, instead of
returning `false` like every other verification failure. Wire your
webhook handler to let that throw propagate to the error middleware —
catching it and mapping to the same 401 as a forged/stale webhook
re-introduces the "every failure looks the same" ambiguity this was
fixed to remove.

When an inbound message has no `Message-Id`, `id` is a deterministic
hash of the sender/original-Date-header/subject (NOT the per-request
Mailgun signing token, which changes on every retry) — so retries of an
id-less message still dedupe to the same id.

## E2E Tests

Integration checklist — drive the real inbound endpoint (live preview, no
mocks), adapt each item to this app's actual inbox/ticket/thread flows, and
check every box off one by one. A box you can't check is an integration bug
to fix — not a skip. COUNTERPARTY: the app can't receive a real email in the
sandbox, so YOU play the mail provider — POST a realistic inbound-email
webhook to the app's inbound endpoint with `sandbox_fetch` (curl runs inside
the container). Model the payload on the BONDED provider's real format
(Mailgun: form fields `sender`/`recipient`/`subject`/`body-plain`/`body-html`/
`attachment-N` plus the `timestamp`/`token`/`signature` triple; SES/Postmark:
their JSON), and the happy-path POST must carry a VALID signature — compute it
the way the provider does (Mailgun signs HMAC-SHA256 of `timestamp+token` with
`MAILGUN_API_KEY` inside the replay window; read the key from the Environment
panel / `.env.molecule`). Never disable `verifySignature()` or mock
`parseWebhookPayload()` to go green — that proves nothing.
- [ ] A signed sample webhook to the inbound endpoint parses into the
  normalized fields (from / to / subject / textBody / htmlBody) AND the app
  ACTS on it — it files the mail into the right place (creates a ticket, a
  comment on a thread, or a reply-thread) keyed off the recipient (`support@`)
  or a plus-address / thread token (`reply+<id>@`). Verify the CREATED record
  (a DB row, and it shows up in the UI) — not just a 200.
- [ ] Routing is correct: an email to `support@` opens a NEW ticket, while
  `reply+<id>@` (or an `In-Reply-To` / `References` match) threads onto the
  EXISTING one — each lands in the right user's / conversation's place, never
  a stranger's.
- [ ] Attachments survive: an inbound message with an attachment has it
  decoded from `attachments[].contentBase64` and stored on the app's OWN
  storage (the uploads bond), not left as a provider link — the stored file
  opens from the ticket.
- [ ] Retries don't duplicate: re-POST the SAME webhook (providers retry slow
  / 5xx deliveries) and confirm handling is idempotent — one ticket, not two
  (dedupe on `id` / `messageId`).
- [ ] Malformed / empty payloads (missing `body-plain`, no attachments, absent
  headers) are handled without a crash — a clean response, not a 500 stack
  trace.
- [ ] SECURITY — the endpoint is AUTHENTICATED: a forged POST with a bad or
  missing signature (or a `timestamp` outside the replay window) is REJECTED
  (401) and creates NO record, so an attacker can't inject mail into another
  user's thread. A missing signing key is a DISTINCT 503, not a 401 — a
  server misconfig must not masquerade as an accepted or forged webhook.
- [ ] SECURITY — the parsed `htmlBody` is sanitized before it is rendered
  anywhere: a `<script>` / `onerror=` in an inbound body must NOT execute when
  the ticket is viewed (no stored XSS from an inbound email body).
