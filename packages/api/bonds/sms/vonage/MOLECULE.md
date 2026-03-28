# @molecule/api-sms-vonage

Vonage SMS provider for molecule.dev.

Implements the `@molecule/api-sms` interface using the Vonage SMS API.

## Type
`provider`

## Installation
```bash
npm install @molecule/api-sms-vonage
```

## Usage

```typescript
import { setProvider } from '@molecule/api-sms'
import { createProvider } from '@molecule/api-sms-vonage'

// Bond at startup (reads VONAGE_* env vars by default)
setProvider(createProvider())

// Or with explicit config
setProvider(createProvider({
  apiKey: 'abc123',
  apiSecret: 'secret',
  defaultFrom: '+15551234567',
}))
```

## API

### Interfaces

#### `VonageSMSConfig`

Configuration for the Vonage SMS provider.

```typescript
interface VonageSMSConfig {
  /** Vonage API key. Defaults to `process.env.VONAGE_API_KEY`. */
  apiKey?: string

  /** Vonage API secret. Defaults to `process.env.VONAGE_API_SECRET`. */
  apiSecret?: string

  /** Default sender phone number or alphanumeric ID. Defaults to `process.env.VONAGE_FROM_NUMBER`. */
  defaultFrom?: string
}
```

### Functions

#### `createProvider(config)`

Creates a Vonage-backed {@link SMSProvider}.

```typescript
function createProvider(config?: VonageSMSConfig): SMSProvider
```

- `config` — Vonage provider configuration. Falls back to environment

**Returns:** A fully initialised `SMSProvider` backed by Vonage.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-sms` 1.0.0
