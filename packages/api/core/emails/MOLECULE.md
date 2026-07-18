# @molecule/api-emails

Email core interface for molecule.dev.

Defines the standard interface for email providers.

## Quick Start

```ts
import { sendMail } from '@molecule/api-emails'

// Account email → the authenticated user's OWN address (not a client-named one).
await sendMail({
  // `emailFrom`: a domain VERIFIED with your provider, read from config (see @remarks) —
  // e.g. `getConfig('EMAIL_FROM', `no-reply@${MAILGUN_DOMAIN}`)`, never a placeholder.
  from: emailFrom,
  to: user.email, // validated, owned by the session
  subject: 'Reset your password',
  html: `<a href="${resetLink}">Reset</a>`, // a single-use link, not the raw token
})
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-emails @molecule/api-bond @molecule/api-i18n
```

## API

### Interfaces

#### `EmailAddress`

Email address with optional display name.

```typescript
interface EmailAddress {
  name?: string
  address: string
}
```

#### `EmailAttachment`

Email file attachment (filename, content as string/Buffer/stream, MIME type, optional CID for inline).

```typescript
interface EmailAttachment {
  filename: string
  content: string | Buffer | NodeJS.ReadableStream
  contentType?: string
  encoding?: string
  cid?: string
}
```

#### `EmailMessage`

Email message options.

```typescript
interface EmailMessage {
  /**
   * Sender address.
   */
  from: string | EmailAddress

  /**
   * Recipient(s).
   */
  to: string | EmailAddress | (string | EmailAddress)[]

  /**
   * CC recipient(s).
   */
  cc?: string | EmailAddress | (string | EmailAddress)[]

  /**
   * BCC recipient(s).
   */
  bcc?: string | EmailAddress | (string | EmailAddress)[]

  /**
   * Reply-to address.
   */
  replyTo?: string | EmailAddress

  /**
   * Email subject.
   */
  subject: string

  /**
   * Plain text body.
   */
  text?: string

  /**
   * HTML body.
   */
  html?: string

  /**
   * File attachments.
   */
  attachments?: EmailAttachment[]

  /**
   * i18n key for the subject (for client-side translation).
   */
  subjectKey?: string

  /**
   * i18n key for the plain text body (for client-side translation).
   */
  textKey?: string

  /**
   * i18n key for the HTML body (for client-side translation).
   */
  htmlKey?: string
}
```

#### `EmailSendResult`

Result of sending an email.

```typescript
interface EmailSendResult {
  /**
   * Whether the email was accepted for delivery.
   */
  accepted: string[]

  /**
   * Addresses that were rejected.
   */
  rejected: string[]

  /**
   * Message ID from the provider.
   */
  messageId?: string

  /**
   * Raw response from the provider.
   */
  response?: string
}
```

#### `EmailTransport`

Email transport interface.

All email providers must implement this interface.

```typescript
interface EmailTransport {
  /**
   * Sends an email message.
   * @returns The send result.
   */
  sendMail(message: EmailMessage): Promise<EmailSendResult>
}
```

### Functions

#### `getTransport()`

Retrieves the bonded email transport, throwing if none is configured.

```typescript
function getTransport(): EmailTransport
```

**Returns:** The bonded email transport.

#### `hasTransport()`

Checks whether an email transport is currently bonded.

```typescript
function hasTransport(): boolean
```

**Returns:** `true` if an email transport is bonded.

#### `sendMail(message)`

Sends an email message using the bonded transport.

```typescript
function sendMail(message: EmailMessage): Promise<EmailSendResult>
```

- `message` — The email message to send, including recipients, subject, and body.

**Returns:** The send result containing accepted/rejected addresses and message ID.

#### `setTransport(transport)`

Registers an email transport as the active singleton. Called by bond
packages during application startup.

```typescript
function setTransport(transport: EmailTransport): void
```

- `transport` — The email transport implementation to bond.

## Available Providers

| Provider | Package |
|----------|---------|
| Capture | `@molecule/api-emails-capture` |
| Mailgun | `@molecule/api-emails-mailgun` |
| SendGrid | `@molecule/api-emails-sendgrid` |
| Sendmail | `@molecule/api-emails-sendmail` |
| AWS SES | `@molecule/api-emails-ses` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-i18n`

Send through {@link sendMail} (the bonded transport) — never hardcode SMTP creds or an API
key; they come from config/secrets and stay SERVER-SIDE.

- **Validate the recipient; never inject user input into headers.** A newline/CRLF in a
  user-supplied `to`/`from`/`subject` is header injection (silent BCCs, spoofed headers) —
  validate the address and strip control characters; don't let a user set arbitrary headers.
- **Don't build an open relay.** Send account emails to the AUTHENTICATED user's OWN
  address, not to whatever address a request names — an endpoint that emails any address on
  demand is a spam/abuse vector. Require auth and rate-limit it.
- **Never put a secret in the body/subject.** A password reset is a single-use LINK, not
  the raw token/secret; don't leak internal errors or stack traces into email content.
- **Build links from a TRUSTED configured origin, never request headers.** A link in an
  email (verification, reset, cancel, invite) must be built from `SITE_ORIGIN` (config),
  NOT `req.headers.origin`/`host`/`x-forwarded-host` — those are caller-controlled, so a
  forged header poisons the emailed link (host-header injection: the token-carrying URL
  sent to a victim points at the attacker's domain → token leak + phishing). e.g.
  `` const origin = getConfig('SITE_ORIGIN', '') || 'http://localhost:3000' ``.
- **The `from` domain must be one you VERIFIED with your provider** (Mailgun/SendGrid/SES),
  or the send is rejected / lands in spam (SPF+DKIM won't align on an unowned domain). Do
  NOT hardcode a placeholder like `noreply@example.com` or an arbitrary domain: read the
  sender from config and default it to your verified sending domain — e.g.
  `` const from = process.env.EMAIL_FROM ?? `no-reply@${process.env.MAILGUN_DOMAIN ?? 'localhost'}` ``
  (the exact env var for the sending domain is provider-specific; `MAILGUN_DOMAIN` for
  Mailgun). One canonical `EMAIL_FROM` override + a default derived from the verified
  domain = email that delivers out of the box.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks). The
sandbox CAPTURES outbound email instead of sending — read each message with
the `read_activity` tool (filter type 'email'); the verification/reset link
is in its payload. Never mock the send or modify production code to expose
it. Adapt each item to this app's actual screens/flows, and check every box
off one by one. A box you can't check is an integration bug to fix — not a
skip:
- [ ] Each email-triggering flow (signup verification, password-reset request,
  invites/notifications the app defines) confirms the send in the UI ("check
  your inbox") and a message actually reaches the transport.
- [ ] The password-reset round-trip completes: request a reset → open the
  captured message → follow its single-use link → set a new password → log
  in with it (and the old password no longer works).
- [ ] The message body contains a LINK, never the raw token/secret, and renders
  with the app's real name/content (no `undefined` placeholders).
- [ ] Requesting a reset for an unknown email shows the same neutral UI response
  as a known one (no account-existence oracle).
- [ ] Account emails go only to the account's own address — no UI or endpoint
  lets an unauthenticated caller send to an arbitrary address.

## Translations

Translation strings are provided by `@molecule/api-locales-emails`.
