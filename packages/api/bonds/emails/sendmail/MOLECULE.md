# @molecule/api-emails-sendmail

Sendmail email provider for molecule.dev.

Uses the local sendmail command to send emails.

Note: For this to work, your server must have `sendmail` installed and
configured. The binary path defaults to `/usr/sbin/sendmail`; set the
`SENDMAIL_PATH` environment variable to use a different binary (e.g.
`/usr/lib/sendmail`, or an msmtp/mhsendmail shim in containers). The path
is read once at module load.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-emails-sendmail
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

Sends an email using the local sendmail binary via nodemailer.

```typescript
function sendMail(message: EmailMessage): Promise<EmailSendResult>
```

- `message` — The email message (to, from, subject, text/html, attachments).

**Returns:** Send result with accepted/rejected addresses and message ID.

### Constants

#### `email` *(deprecated)*

Legacy export - the raw nodemailer transport.

```typescript
const email: nodemailer.Transporter<SentMessageInfo, Options>
```

#### `nodemailerTransport`

The underlying nodemailer transport.

The sendmail binary path defaults to `/usr/sbin/sendmail` and can be
overridden with the `SENDMAIL_PATH` environment variable (e.g.
`/usr/lib/sendmail`, or an msmtp/mhsendmail shim in containers and tests).
The path is read once at module load; if the binary is missing, sends fail
with a `spawn ... ENOENT` error at send time — install sendmail or point
`SENDMAIL_PATH` at a compatible binary.

```typescript
const nodemailerTransport: nodemailer.Transporter<SentMessageInfo, Options>
```

#### `provider`

The sendmail email provider implementing the standard interface.

```typescript
const provider: EmailTransport
```

#### `transport` *(deprecated)*

Legacy export - the raw nodemailer transport.

```typescript
const transport: nodemailer.Transporter<SentMessageInfo, Options>
```

## Core Interface
Implements `@molecule/api-emails` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setTransport } from '@molecule/api-emails'
import { provider } from '@molecule/api-emails-sendmail'

export function setupEmailsSendmail(): void {
  setTransport(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-emails` ^1.0.0

On success, `sendMail()` resolves with `accepted` set to the envelope
recipients (sendmail queues the message for all of them once the binary
exits 0) and `response: 'Messages queued for delivery'`. Failures reject
with distinct errors: a missing binary is a `spawn ... ENOENT` error
(install sendmail or set `SENDMAIL_PATH`), a binary that exits non-zero is
`Sendmail exited with code <n>`, and an envelope address starting with `-`
is rejected up front with `Invalid envelope addresses.` (argument-injection
guard) — inspect the message/`code` to tell configuration problems apart
from delivery problems.
