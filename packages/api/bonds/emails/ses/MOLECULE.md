# @molecule/api-emails-ses

AWS SES email provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-emails-ses
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

Sends an email through AWS SES via nodemailer.

```typescript
function sendMail(message: EmailMessage): Promise<EmailSendResult>
```

- `message` — The email message (to, from, subject, text/html, attachments).

**Returns:** Send result with accepted/rejected addresses and message ID.

### Constants

#### `email` *(deprecated)*

Raw nodemailer transport alias.

```typescript
const email: nodemailer.Transporter<SentMessageInfo, Options>
```

#### `emailsSesSecretDefinitions`

Secret definitions required by the AWS SES email bond.

```typescript
const emailsSesSecretDefinitions: SecretDefinition[]
```

#### `provider`

The SES email provider implementing the `EmailTransport` interface.

```typescript
const provider: EmailTransport
```

#### `ses`

The AWS SESv2 client instance, configured from `AWS_SES_REGION`. An optional
`AWS_SES_ENDPOINT` overrides the service endpoint (for a credential broker or
a self-hosted / SES-compatible service). When unset, the SDK resolves the
default regional endpoint, so behaviour is unchanged.

nodemailer 7 requires the SESv2 client + SendEmailCommand pair — the old
`{ ses, aws }` (@aws-sdk/client-ses) shape made `createTransport` THROW at
import time ("legacy SES configuration"), breaking every real consumer of
this bond.

```typescript
const ses: SESv2Client
```

#### `transport` *(deprecated)*

Raw nodemailer transport for direct access.

```typescript
const transport: nodemailer.Transporter<SentMessageInfo, Options>
```

## Core Interface
Implements `@molecule/api-emails` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setTransport } from '@molecule/api-emails'
import { provider } from '@molecule/api-emails-ses'

export function setupEmailsSes(): void {
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

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks; use the
dev/capture transport to inspect sent mail), adapt each item to this app's
actual screens/flows, and check every box off one by one. A box you can't
check is an integration bug to fix — not a skip:
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
