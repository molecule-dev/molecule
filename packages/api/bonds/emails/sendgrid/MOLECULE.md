# @molecule/api-emails-sendgrid

SendGrid email provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-emails-sendgrid @molecule/api-bond @molecule/api-emails @molecule/api-secrets @sendgrid/mail
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

Sends an email through the SendGrid API.

```typescript
function sendMail(message: EmailMessage): Promise<EmailSendResult>
```

- `message` — The email message (to, from, subject, text/html, attachments).

**Returns:** Send result with accepted addresses, message ID, and status code.

### Constants

#### `emailsSendgridSecretDefinitions`

Secret definitions required by the SendGrid email bond.

```typescript
const emailsSendgridSecretDefinitions: SecretDefinition[]
```

#### `provider`

The SendGrid email provider implementing the standard interface.

```typescript
const provider: EmailTransport
```

#### `sgClient`

The configured SendGrid mail client.

```typescript
const sgClient: sgMail.MailService
```

## Core Interface
Implements `@molecule/api-emails` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setTransport } from '@molecule/api-emails'
import { provider } from '@molecule/api-emails-sendgrid'

export function setupEmailsSendgrid(): void {
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

- `SENDGRID_API_KEY` *(required)* — SendGrid API key
  - Setup: SendGrid → Settings → API Keys → Create API Key with Mail Send permission.
  - Get it here: [https://app.sendgrid.com/settings/api_keys](https://app.sendgrid.com/settings/api_keys)
  - Example: `SG....`

### Runtime Dependencies

- `@molecule/api-bond`
- `@molecule/api-emails`
- `@molecule/api-secrets`
- `@sendgrid/mail`

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
