# @molecule/api-emails-ses

AWS SES email provider for molecule.dev.

## Quick Start

```typescript
import { setTransport } from '@molecule/api-emails'
import { provider } from '@molecule/api-emails-ses'

setTransport(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-emails-ses @aws-sdk/client-sesv2 @aws-sdk/credential-provider-node @molecule/api-bond @molecule/api-emails @molecule/api-secrets nodemailer
npm install -D @types/nodemailer
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

#### `getSesClient()`

Returns the AWS SESv2 client, constructing it from the environment on the
FIRST call and memoizing thereafter.

Construction is deferred to first use — NOT module load — so a region resolved
into `process.env` AFTER this module is imported (late secrets resolution via
a secrets bond) is honored: `AWS_SES_REGION` (default `us-east-1`) and the
optional `AWS_SES_ENDPOINT` are read at send time, not frozen at import.
Reading them at import instead pinned an empty/default region and every send
failed in the WRONG region ("Email address is not verified"). Credentials
still resolve lazily via the AWS default chain (`AWS_ACCESS_KEY_ID`/
`AWS_SECRET_ACCESS_KEY`, shared config, or an instance role) at send time, so
a missing credential surfaces then as a descriptive AWS SDK error.

nodemailer 7 requires the SESv2 client + `SendEmailCommand` pair — the old
`{ ses, aws }` (@aws-sdk/client-ses) shape made `createTransport` THROW
("legacy SES configuration"), breaking every real consumer of this bond.

```typescript
function getSesClient(): SESv2Client
```

**Returns:** The configured SESv2 client.

#### `sendMail(message)`

Sends an email through AWS SES via nodemailer. The SES client and transport
are configured lazily from the environment on the first call, so late-resolved
region/credentials are honored.

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

#### `transport` *(deprecated)*

Raw nodemailer transport for direct access. Lazily configured on first send.

```typescript
const transport: { sendMail: (msg: nodemailer.SendMailOptions) => Promise<any>; }
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

### Runtime Dependencies

- `@aws-sdk/client-sesv2`
- `@aws-sdk/credential-provider-node`
- `@molecule/api-bond`
- `@molecule/api-emails`
- `@molecule/api-secrets`
- `nodemailer`

- **Configuration is lazy and env-driven**: the SES client is constructed on
  the FIRST send — NOT at import — so `AWS_SES_REGION` (default `us-east-1`)
  and the optional `AWS_SES_ENDPOINT` are read at send time. A region resolved
  into env AFTER this module is imported (late secrets resolution via a
  secrets bond) is honored; reading it at import instead froze the
  default/empty region and sends failed in the WRONG region ("Email address
  is not verified"). Credentials resolve lazily via the AWS default chain
  (`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`, shared config, or an instance
  role), so they may arrive after import too.
- **No fail-fast**: because credentials can legitimately come from an instance
  role or shared config (not env), missing credentials are not pre-checked —
  they surface at first send as a descriptive AWS SDK error ("Could not load
  credentials…"), not a tagged config error naming the env var.
- New SES accounts are sandboxed: both the sender identity AND every
  recipient must be verified until production access is granted.
- On success `accepted` is mapped from `envelope.to` — nodemailer's SES
  transport never sets `accepted`/`rejected` (the @types/nodemailer typings
  claiming otherwise are drift); a resolved send means SES accepted the
  message for every envelope recipient.

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
