# @molecule/api-sms-twilio

Twilio SMS provider for molecule.dev.

Implements the `@molecule/api-sms` interface using the Twilio REST API.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-sms-twilio
```

## Usage

```typescript
import { setProvider } from '@molecule/api-sms'
import { createProvider } from '@molecule/api-sms-twilio'

// Bond at startup (reads TWILIO_* env vars by default)
setProvider(createProvider())

// Or with explicit config
setProvider(createProvider({
  accountSid: 'AC...',
  authToken: 'xxx',
  defaultFrom: '+15551234567',
}))
```

## API

### Interfaces

#### `TwilioSMSConfig`

Configuration for the Twilio SMS provider.

```typescript
interface TwilioSMSConfig {
  /** Twilio Account SID. Defaults to `process.env.TWILIO_ACCOUNT_SID`. */
  accountSid?: string

  /** Twilio Auth Token. Defaults to `process.env.TWILIO_AUTH_TOKEN`. */
  authToken?: string

  /** Default sender phone number in E.164 format. Defaults to `process.env.TWILIO_FROM_NUMBER`. */
  defaultFrom?: string
}
```

### Functions

#### `createProvider(config)`

Creates a Twilio-backed {@link SMSProvider}.

```typescript
function createProvider(config?: TwilioSMSConfig): SMSProvider
```

- `config` — Twilio provider configuration. Falls back to environment

**Returns:** A fully initialised `SMSProvider` backed by Twilio.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-sms` 1.0.0
