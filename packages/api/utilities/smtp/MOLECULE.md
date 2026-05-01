# @molecule/api-smtp

Direct SMTP send client for molecule.dev.

Sends mail through a **user-supplied** SMTP server (host, port,
credentials owned by the end-user — for example, the email-client
flagship app where each user signs in to their own mailbox). This
is intentionally distinct from the `@molecule/api-emails-*` bonds,
which wrap **transactional** providers like Mailgun, SendGrid, and
SES that send mail on the application's behalf.

Wraps `nodemailer` so consumers never import nodemailer types
directly — swapping the underlying library would only require
changes inside this package.

## Quick Start

```ts
import { connectSmtp } from '@molecule/api-smtp'

const client = await connectSmtp({
  host: 'smtp.example.com',
  port: 587,
  secure: false,
  requireTLS: true,
  auth: { user: 'me@example.com', pass: 'app-password' },
})

await client.verify()
const result = await client.sendMail({
  from: 'me@example.com',
  to: 'friend@example.com',
  subject: 'hi',
  text: 'hello world',
})
await client.disconnect()
```

## Type
`utility`

## Installation
```bash
npm install @molecule/api-smtp
```

## API

### Interfaces

#### `ConnectSmtpInternals`

Optional injection point used by tests to swap in a fake nodemailer
implementation. Production callers never need this.

```typescript
interface ConnectSmtpInternals {
  /**
   * Replacement for `nodemailer.createTransport`. Must return a
   * minimal `Transporter`-compatible object with `verify`,
   * `sendMail`, and `close` methods.
   */
  createTransport?: (
    options: SMTPTransport.Options,
  ) => Pick<Transporter<SMTPTransport.SentMessageInfo>, 'verify' | 'sendMail' | 'close'>
}
```

#### `SendResult`

Result of a successful {@link SmtpClient.sendMail} call.

```typescript
interface SendResult {
  /** RFC-5322 `Message-ID` of the queued message. */
  messageId: string

  /** Recipient addresses the server accepted. */
  accepted: string[]

  /** Recipient addresses the server rejected. */
  rejected: string[]

  /** Raw final SMTP response line (e.g. `"250 2.0.0 OK ..."`). */
  response: string
}
```

#### `SmtpAttachment`

One MIME attachment to be sent as part of an {@link SmtpMessage}.

Either `content` (raw bytes / string) or `path` (filesystem path)
must be provided — never both.

```typescript
interface SmtpAttachment {
  /** Filename shown to the recipient. */
  filename: string

  /**
   * Raw attachment content. Use this OR {@link SmtpAttachment.path},
   * not both.
   */
  content?: string | Buffer | Uint8Array

  /**
   * Path to a local file. Use this OR
   * {@link SmtpAttachment.content}, not both.
   */
  path?: string

  /**
   * Optional MIME type. If omitted, nodemailer infers from the
   * filename extension.
   */
  contentType?: string
}
```

#### `SmtpClient`

Connected SMTP client. Created via {@link connectSmtp}.

```typescript
interface SmtpClient {
  /**
   * Verify the connection / credentials by issuing a dry SMTP
   * handshake. Resolves on success, rejects with {@link SmtpError}
   * otherwise.
   */
  verify(): Promise<void>

  /**
   * Send a single mail message.
   *
   * @param message - Message to send.
   * @returns Normalized {@link SendResult}.
   * @throws {SmtpError} on connection / send failure.
   */
  sendMail(message: SmtpMessage): Promise<SendResult>

  /**
   * Close the connection pool and release sockets. Safe to call
   * multiple times.
   */
  disconnect(): Promise<void>
}
```

#### `SmtpConfig`

Connection + authentication parameters for {@link connectSmtp}.

`auth` may be `null` for unauthenticated relays (rare — typically
only same-host development MTAs).

```typescript
interface SmtpConfig {
  /** SMTP server hostname. */
  host: string

  /** SMTP server port — typically 465 (TLS), 587 (STARTTLS), or 25. */
  port: number

  /**
   * If `true`, use implicit TLS on connect (port 465 style). When
   * `false` or omitted, the connection starts plain and may upgrade
   * via STARTTLS depending on {@link SmtpConfig.requireTLS}.
   */
  secure?: boolean

  /**
   * Authentication credentials, or `null` for an unauthenticated
   * relay.
   */
  auth: SmtpPasswordAuth | SmtpOAuth2Auth | null

  /**
   * If `true`, refuse to send mail unless the connection has been
   * upgraded to TLS (via STARTTLS when `secure` is `false`). Defaults
   * to `false`.
   */
  requireTLS?: boolean

  /**
   * Connection timeout in milliseconds. Defaults to 30_000.
   */
  connectionTimeoutMs?: number

  /**
   * Socket idle timeout in milliseconds. Defaults to 30_000.
   */
  socketTimeoutMs?: number

  /**
   * Greeting timeout in milliseconds. Defaults to 30_000.
   */
  greetingTimeoutMs?: number
}
```

#### `SmtpMessage`

A single email message to send via {@link SmtpClient.sendMail}.

Address fields accept either a single RFC-5322 address string or an
array of address strings — multi-recipient is the only field-level
variation the underlying library supports without bespoke parsing.

```typescript
interface SmtpMessage {
  /** Sender address (`"Name <name@example.com>"` or just the address). */
  from: string

  /** Primary recipient address(es). */
  to: string | string[]

  /** Optional CC recipient address(es). */
  cc?: string | string[]

  /** Optional BCC recipient address(es). */
  bcc?: string | string[]

  /** Subject line — plain text, no encoding required. */
  subject: string

  /** Plain-text body. At least one of `text`/`html` should be set. */
  text?: string

  /** HTML body. At least one of `text`/`html` should be set. */
  html?: string

  /** Optional `Reply-To` address. */
  replyTo?: string

  /** Optional list of attachments. */
  attachments?: SmtpAttachment[]

  /**
   * Additional headers, keyed by header name. Values that are arrays
   * produce repeated headers (e.g. multiple `Received` headers).
   */
  headers?: Record<string, string | string[]>
}
```

#### `SmtpOAuth2Auth`

OAuth2 bearer-token SMTP credentials (e.g. Gmail XOAUTH2).

```typescript
interface SmtpOAuth2Auth {
  /** Account email / SASL identity. */
  user: string

  /** Pre-fetched OAuth2 access token. */
  accessToken: string
}
```

#### `SmtpPasswordAuth`

Password-style SMTP credentials.

```typescript
interface SmtpPasswordAuth {
  /** SMTP username (often the full email address). */
  user: string

  /** SMTP password or app-specific password. */
  pass: string
}
```

### Types

#### `SmtpErrorCode`

Stable machine-readable error codes emitted by {@link SmtpError}.

```typescript
type SmtpErrorCode =
  | 'invalid-config'
  | 'connection-failed'
  | 'auth-failed'
  | 'tls-required'
  | 'send-failed'
  | 'timeout'
  | 'disconnected'
```

### Classes

#### `SmtpError`

Error thrown by {@link connectSmtp} / {@link SmtpClient} methods.

`code` is a stable machine-readable string; `message` is the
developer-facing English description (handler-error pattern — locale
bond not required for this utility).

### Functions

#### `buildTransportOptions(config)`

Build the nodemailer transport options from a {@link SmtpConfig}.

Kept as a pure function so the test suite can assert the exact
shape we hand to nodemailer (and therefore confirm we never leak
caller credentials beyond what is necessary).

```typescript
function buildTransportOptions(config: SmtpConfig): SMTPTransport.Options
```

- `config` — Validated config.

**Returns:** Options for `nodemailer.createTransport`.

#### `connectSmtp(config, internals)`

Connect to a user-supplied SMTP server and return a normalized
{@link SmtpClient} bound to it.

The returned client wraps a single nodemailer transporter — it is
safe to keep the client around for multiple `sendMail` calls and
to share between concurrent senders.

```typescript
function connectSmtp(config: SmtpConfig, internals?: ConnectSmtpInternals): Promise<SmtpClient>
```

- `config` — SMTP connection + auth config.
- `internals` — Optional test-only injection point.

**Returns:** Connected {@link SmtpClient}.

## Injection Notes

Throws {@link SmtpError} (`error.code` is one of `invalid-config`,
`connection-failed`, `auth-failed`, `tls-required`, `send-failed`,
`timeout`, `disconnected`). Map `error.code` to translated
user-facing text in the calling handler — this utility intentionally
has no locale bond (handler-error pattern).
