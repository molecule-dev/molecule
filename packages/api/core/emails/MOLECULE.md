# @molecule/api-emails

Email core interface for molecule.dev.

Defines the standard interface for email providers.

## Type
`core`

## Installation
```bash
npm install @molecule/api-emails
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
| Mailgun | `@molecule/api-emails-mailgun` |
| SendGrid | `@molecule/api-emails-sendgrid` |
| Sendmail | `@molecule/api-emails-sendmail` |
| AWS SES | `@molecule/api-emails-ses` |

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0

## Translations

Translation strings are provided by `@molecule/api-locales-emails`.
