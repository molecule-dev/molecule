# @molecule/api-emails-mailgun

Mailgun email provider for molecule.dev.

## Quick Start

```typescript
import { setTransport } from '@molecule/api-emails'
import { provider } from '@molecule/api-emails-mailgun'

setTransport(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-emails-mailgun @molecule/api-bond @molecule/api-emails @molecule/api-secrets nodemailer nodemailer-mailgun-transport
npm install -D @types/nodemailer @types/nodemailer-mailgun-transport
```

## API

### Interfaces

#### `EmailMessage`

Email message options.

```typescript
interface EmailMessage {
    /**
     * Sender address.
     */
    from: string | EmailAddress;
    /**
     * Recipient(s).
     */
    to: string | EmailAddress | (string | EmailAddress)[];
    /**
     * CC recipient(s).
     */
    cc?: string | EmailAddress | (string | EmailAddress)[];
    /**
     * BCC recipient(s).
     */
    bcc?: string | EmailAddress | (string | EmailAddress)[];
    /**
     * Reply-to address.
     */
    replyTo?: string | EmailAddress;
    /**
     * Email subject.
     */
    subject: string;
    /**
     * Plain text body.
     */
    text?: string;
    /**
     * HTML body.
     */
    html?: string;
    /**
     * File attachments.
     */
    attachments?: EmailAttachment[];
    /**
     * i18n key for the subject (for client-side translation).
     */
    subjectKey?: string;
    /**
     * i18n key for the plain text body (for client-side translation).
     */
    textKey?: string;
    /**
     * i18n key for the HTML body (for client-side translation).
     */
    htmlKey?: string;
}
```

#### `EmailSendResult`

Result of sending an email.

```typescript
interface EmailSendResult {
    /**
     * Whether the email was accepted for delivery.
     */
    accepted: string[];
    /**
     * Addresses that were rejected.
     */
    rejected: string[];
    /**
     * Message ID from the provider.
     */
    messageId?: string;
    /**
     * Raw response from the provider.
     */
    response?: string;
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
    sendMail(message: EmailMessage): Promise<EmailSendResult>;
}
```

### Functions

#### `sendMail(message)`

Sends an email message via the Mailgun API, with automatic test-mode handling for sandbox domains.

```typescript
function sendMail(message: EmailMessage): Promise<EmailSendResult>
```

- `message` — The email message (to, from, subject, text/html, attachments).

**Returns:** Send result with accepted/rejected addresses and message ID.

### Constants

#### `email` *(deprecated)*

Raw nodemailer transport alias.

```typescript
const email: { sendMail: (msg: nodemailer.SendMailOptions) => Promise<any>; }
```

#### `mailgunSecretDefinitions`

Secret definitions required by the Mailgun email bond.

```typescript
const mailgunSecretDefinitions: SecretDefinition[]
```

#### `provider`

The Mailgun email provider implementing the `EmailTransport` interface.

```typescript
const provider: EmailTransport
```

#### `transport` *(deprecated)*

Raw nodemailer transport for direct access.

```typescript
const transport: { sendMail: (msg: nodemailer.SendMailOptions) => Promise<any>; }
```

## Core Interface
Implements `@molecule/api-emails` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setTransport } from '@molecule/api-emails'
import { provider } from '@molecule/api-emails-mailgun'

export function setupEmailsMailgun(): void {
  setTransport(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-emails` ^1.0.0
- `@molecule/api-secrets` ^1.0.0

### Environment Variables

- `MAILGUN_API_KEY` *(required)* — Mailgun API key
  - Setup: Mailgun dashboard → Settings → API Security → create/copy a sending API key.
  - Get it here: [https://app.mailgun.com/settings/api_security](https://app.mailgun.com/settings/api_security)
- `MAILGUN_DOMAIN` *(required)* — Mailgun sending domain
  - Setup: Add and verify a sending domain in Mailgun (sandbox domains work for testing to authorized recipients).
  - Get it here: [https://app.mailgun.com/mg/sending/domains](https://app.mailgun.com/mg/sending/domains)
  - Example: `mg.example.com`
- `MAILGUN_API_HOST` *(optional)* — Mailgun API host
  - Setup: Only needed for EU-region Mailgun accounts (api.eu.mailgun.net) or a self-hosted/broker endpoint; leave unset for US-region accounts.
  - Example: `api.eu.mailgun.net`

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-emails`
- `@molecule/api-secrets`
- `nodemailer`
- `nodemailer-mailgun-transport`

- **EU-region Mailgun accounts must set `MAILGUN_API_HOST=api.eu.mailgun.net`**
  (optional env; defaults to Mailgun's US endpoint). Without it every send
  fails upstream with 401 even though the key is valid — wrong region, not
  wrong key.
- **Sandbox domains auto-enable Mailgun test mode**: when `MAILGUN_DOMAIN`
  matches `sandbox*.mailgun.org` (or `MAILGUN_TEST_MODE=true`), sends carry
  `o:testmode=yes` — Mailgun accepts, validates, and assigns a message id
  but NEVER delivers. A sandbox 403 for an unauthorized recipient is
  reported as a synthetic success (`response: 'sandbox-test-mode'`). "Send
  succeeded but no email arrived" in dev is this behavior, not a bug.
- Credentials are read lazily on first send and fail fast with a tagged
  `config.notConfigured` error naming the missing key (`MAILGUN_API_KEY`,
  then `MAILGUN_DOMAIN`). On success `accepted` echoes the message's own
  recipients (Mailgun's transport returns no per-recipient verdict).
- **The `from` address's domain must equal `MAILGUN_DOMAIN`** (Mailgun sends
  through, and signs SPF/DKIM for, that verified domain). A `from` on any other
  domain — a hardcoded `noreply@example.com`, `noreply@store.com`, etc. — is
  rejected or unsigned (spam). Default the sender to the sending domain:
  `` process.env.EMAIL_FROM ?? `no-reply@${process.env.MAILGUN_DOMAIN}` `` — never
  a literal placeholder domain.

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
