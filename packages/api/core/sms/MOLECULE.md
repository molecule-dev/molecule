# @molecule/api-sms

SMS core interface for molecule.dev.

Defines the standard interface for SMS messaging providers
(Twilio, Vonage, etc.).

## Quick Start

```typescript
import { setProvider, send, getStatus } from '@molecule/api-sms'

// Bond a provider at startup
setProvider(twilioProvider)

// Send a message
const result = await send('+1234567890', 'Hello from Molecule!')

// Check delivery status
const status = await getStatus(result.id)
console.log(status.status) // 'delivered'
```

## Type
`core`

## Installation
```bash
npm install @molecule/api-sms
```

## API

### Interfaces

#### `BulkSMSMessage`

A single message in a bulk send operation.

```typescript
interface BulkSMSMessage {
  /** Recipient phone number. */
  to: string

  /** Message body text. */
  message: string

  /** Per-message send options. */
  options?: SMSOptions
}
```

#### `BulkSMSResult`

Result of a bulk SMS send operation.

```typescript
interface BulkSMSResult {
  /** Individual results for each message in the batch. */
  results: SMSResult[]

  /** Total number of messages in the batch. */
  total: number

  /** Number of messages that were successfully queued or sent. */
  successful: number

  /** Number of messages that failed. */
  failed: number
}
```

#### `SMSOptions`

Options for sending an SMS message.

```typescript
interface SMSOptions {
  /** Sender phone number or alphanumeric ID. */
  from?: string

  /** Schedule the message for future delivery. */
  scheduledAt?: Date

  /** URL to receive delivery status callbacks. */
  callbackUrl?: string
}
```

#### `SMSProvider`

SMS provider interface.

All SMS providers must implement this interface to provide
send, bulk send, and status query capabilities.

```typescript
interface SMSProvider {
  /**
   * Sends a single SMS message.
   *
   * @param to - Recipient phone number in E.164 format.
   * @param message - Message body text.
   * @param options - Optional send configuration.
   * @returns The send result with message ID and status.
   */
  send(to: string, message: string, options?: SMSOptions): Promise<SMSResult>

  /**
   * Sends multiple SMS messages in a single batch.
   *
   * @param messages - Array of messages to send.
   * @returns Aggregated results for the entire batch.
   */
  sendBulk(messages: BulkSMSMessage[]): Promise<BulkSMSResult>

  /**
   * Retrieves the delivery status of a previously sent message.
   *
   * @param messageId - The provider-assigned message identifier.
   * @returns Current delivery status information.
   */
  getStatus(messageId: string): Promise<SMSStatus>
}
```

#### `SMSResult`

Result of sending a single SMS message.

```typescript
interface SMSResult {
  /** Provider-assigned message identifier. */
  id: string

  /** Current delivery status. */
  status: 'queued' | 'sent' | 'delivered' | 'failed'

  /** Recipient phone number. */
  to: string
}
```

#### `SMSStatus`

Delivery status information for a previously sent message.

```typescript
interface SMSStatus {
  /** Provider-assigned message identifier. */
  id: string

  /** Current delivery status. */
  status: 'queued' | 'sent' | 'delivered' | 'failed'

  /** When the message was delivered, if applicable. */
  deliveredAt?: Date

  /** Error description if the message failed. */
  error?: string
}
```

### Functions

#### `getProvider()`

Retrieves the bonded SMS provider, throwing if none is configured.

```typescript
function getProvider(): SMSProvider
```

**Returns:** The bonded SMS provider.

#### `getStatus(messageId)`

Retrieves the delivery status of a previously sent message.

```typescript
function getStatus(messageId: string): Promise<SMSStatus>
```

- `messageId` — The provider-assigned message identifier.

**Returns:** Current delivery status information.

#### `hasProvider()`

Checks whether an SMS provider is currently bonded.

```typescript
function hasProvider(): boolean
```

**Returns:** `true` if an SMS provider is bonded.

#### `send(to, message, options)`

Sends a single SMS message using the bonded provider.

```typescript
function send(to: string, message: string, options?: SMSOptions): Promise<SMSResult>
```

- `to` — Recipient phone number in E.164 format.
- `message` — Message body text.
- `options` — Optional send configuration.

**Returns:** The send result with message ID and status.

#### `sendBulk(messages)`

Sends multiple SMS messages in a single batch using the bonded provider.

```typescript
function sendBulk(messages: BulkSMSMessage[]): Promise<BulkSMSResult>
```

- `messages` — Array of messages to send.

**Returns:** Aggregated results for the entire batch.

#### `setProvider(provider)`

Registers an SMS provider as the active singleton. Called by bond
packages during application startup.

```typescript
function setProvider(provider: SMSProvider): void
```

- `provider` — The SMS provider implementation to bond.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-bond` ^1.0.0
- `@molecule/api-i18n` ^1.0.0
