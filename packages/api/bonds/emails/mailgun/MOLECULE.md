# @molecule/api-emails-mailgun

Mailgun email provider for molecule.dev.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-emails-mailgun
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

Sends an email through the Mailgun API via nodemailer.

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

#### `provider`

The Mailgun email provider implementing the `EmailTransport` interface.

```typescript
const provider: EmailTransport
```

#### `transport` *(deprecated)*

Raw nodemailer transport for direct access.

```typescript
const transport: nodemailer.Transporter<SentMessageInfo, Options>
```

## Core Interface
Implements `@molecule/api-emails` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-emails` ^1.0.0

### Environment Variables

- `MAILGUN_API_KEY` *(required)*
- `MAILGUN_DOMAIN` *(required)*
