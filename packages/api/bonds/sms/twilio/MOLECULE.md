# @molecule/api-sms-twilio

Twilio SMS provider for molecule.dev.

Implements the `@molecule/api-sms` interface using the Twilio REST API.

## Quick Start

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

## Type
`provider`

## Installation
```bash
npm install @molecule/api-sms-twilio
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

### Constants

#### `smsTwilioSecretDefinitions`

Secret definitions required by the Twilio SMS bond.

```typescript
const smsTwilioSecretDefinitions: SecretDefinition[]
```

## Core Interface
Implements `@molecule/api-sms` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-secrets` ^1.0.0
- `@molecule/api-sms` 1.0.0

### Environment Variables

- `TWILIO_ACCOUNT_SID` *(required)* — Twilio account SID
  - Setup: Copy the Account SID from the Twilio Console dashboard.
  - Get it here: [https://console.twilio.com/](https://console.twilio.com/)
  - Example: `AC...`
- `TWILIO_AUTH_TOKEN` *(required)* — Twilio auth token
  - Setup: Copy the Auth Token from the Twilio Console dashboard.
  - Get it here: [https://console.twilio.com/](https://console.twilio.com/)
- `TWILIO_FROM_NUMBER` *(required)* — Twilio from number
  - Setup: Buy or verify a phone number in Twilio and use it in E.164 format.
  - Get it here: [https://console.twilio.com/us1/develop/phone-numbers/manage/incoming](https://console.twilio.com/us1/develop/phone-numbers/manage/incoming)
  - Example: `+15551234567`
