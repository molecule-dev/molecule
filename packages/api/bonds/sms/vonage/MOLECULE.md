# @molecule/api-sms-vonage

Vonage SMS provider for molecule.dev.

Implements the `@molecule/api-sms` interface using the Vonage SMS API.

Two `SMSOptions` capabilities are NOT supported by the Vonage SMS API —
this bond fails fast instead of silently dropping them:
- `options.scheduledAt`: `send()` throws ('Vonage SMS API does not support
  scheduled sending.') — delay dispatch with a job scheduler instead.
- `getStatus()`: always throws — Vonage reports delivery only via DLR
  webhooks. Pass `options.callbackUrl` to `send()`/`sendBulk()` and
  receive delivery receipts on that endpoint instead of polling.

Credentials are captured ONCE when `createProvider()` runs — setting
`VONAGE_*` later in the same process has no effect until the provider is
re-created (an API restart after filling in secrets does this).

## Quick Start

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

## Type
`provider`

## Installation
```bash
npm install @molecule/api-sms-vonage @molecule/api-secrets @molecule/api-sms @vonage/server-sdk
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

Credential validation is DEFERRED to first use (send/sendBulk) rather
than thrown here — matching the slack/web-push bonds in this category.
An app that has selected Vonage but hasn't filled in its secrets yet can
still boot; only the first actual SMS attempt throws the actionable
"apiKey/apiSecret is required" error, instead of the whole API crashing
at `setProvider(createProvider())` startup time.

```typescript
function createProvider(config?: VonageSMSConfig): SMSProvider
```

- `config` — Vonage provider configuration. Falls back to environment variables when individual fields are omitted.

**Returns:** A fully initialised `SMSProvider` backed by Vonage.

### Constants

#### `smsVonageSecretDefinitions`

Secret definitions required by the Vonage SMS bond.

```typescript
const smsVonageSecretDefinitions: SecretDefinition[]
```

## Core Interface
Implements `@molecule/api-sms` interface.

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-secrets` ^1.0.0
- `@molecule/api-sms` 1.0.0

### Environment Variables

- `VONAGE_API_KEY` *(required)* — Vonage API key
  - Setup: Copy the API key from the Vonage API Dashboard.
  - Get it here: [https://dashboard.nexmo.com/](https://dashboard.nexmo.com/)
- `VONAGE_API_SECRET` *(required)* — Vonage API secret
  - Setup: Copy the API secret from the Vonage API Dashboard.
  - Get it here: [https://dashboard.nexmo.com/](https://dashboard.nexmo.com/)
- `VONAGE_FROM_NUMBER` *(required)* — Vonage from number
  - Setup: Buy or verify a phone number (or alphanumeric sender ID) in Vonage and use it in E.164 format.
  - Get it here: [https://dashboard.nexmo.com/your-numbers](https://dashboard.nexmo.com/your-numbers)
  - Example: `+15551234567`

### Runtime Dependencies

- `@molecule/api-secrets`
- `@molecule/api-sms`
- `@vonage/server-sdk`

Importing this package registers `VONAGE_API_KEY` / `VONAGE_API_SECRET` /
`VONAGE_FROM_NUMBER` with `@molecule/api-secrets` (mirroring the Twilio
bond), so a scaffolded app selecting Vonage gets env-var scaffolding and a
boot-time secrets report naming the missing keys.

`createProvider()` does NOT validate credentials eagerly — missing
`VONAGE_API_KEY`/`VONAGE_API_SECRET` will not throw at bond time.
`setProvider(createProvider())` always succeeds; the actionable
"apiKey/apiSecret is required" error is thrown on the first actual
`send()`/`sendBulk()` call instead, so a scaffolded app that selected
Vonage before filling in secrets still boots (SMS just degrades until the
secret is set), matching the slack/web-push bonds in this category.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Each SMS-triggering flow (phone verification, OTP login, alerts the
  app defines) confirms the send in the UI and a message actually reaches
  the transport. The sandbox CAPTURES outbound SMS instead of sending — read
  it with the `read_activity` tool (filter type 'sms'); the code/link is in
  its payload. Never mock the flow or modify production code to expose it.
- [ ] The OTP round-trip completes: request a code → read the captured
  message's code → enter it in the UI → the flow advances; a wrong or
  expired code is rejected with a visible error.
- [ ] Messages go only to the authenticated user's own verified number — no
  UI or endpoint lets a caller text an arbitrary number (spam/abuse vector).
