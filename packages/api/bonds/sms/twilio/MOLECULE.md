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
npm install @molecule/api-sms-twilio @molecule/api-logger @molecule/api-secrets @molecule/api-sms twilio
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

Credential validation is DEFERRED to first use (send/sendBulk/getStatus)
rather than thrown here — matching the slack/web-push bonds in this
category. An app that has selected Twilio but hasn't filled in its
secrets yet can still boot; only the first actual SMS attempt throws the
actionable "accountSid/authToken is required" error, instead of the whole
API crashing at `setProvider(createProvider())` startup time.

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
- `@molecule/api-logger` ^1.0.0
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

### Runtime Dependencies

- `@molecule/api-logger`
- `@molecule/api-secrets`
- `@molecule/api-sms`
- `twilio`

`createProvider()` does NOT validate credentials eagerly — missing
`TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN` will not throw at bond time.
`setProvider(createProvider())` always succeeds; the actionable
"accountSid/authToken is required" error is thrown on the first actual
`send()`/`sendBulk()`/`getStatus()` call instead, so a scaffolded app that
selected Twilio before filling in secrets still boots (SMS just degrades
until the secret is set), matching the slack/web-push bonds in this
category.

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
