# @molecule/api-sms-capture

SMS capture provider for molecule.dev.

Records every `send()` / `sendBulk()` call as an activity event.
Intercept-only by default; delegates + tees when wrapping a real provider.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-sms'
import { provider } from '@molecule/api-sms-capture'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-sms-capture @molecule/api-activity @molecule/api-sms
```

## API

### Functions

#### `createSMSCaptureProvider(realProvider)`

Creates an SMS capture provider.

When `realProvider` is provided, each message is delivered through it and the
captured event records the real outcome (delegate + tee). When omitted (the
dev default), messages are intercepted and a synthetic `SMSResult` is
returned.

```typescript
function createSMSCaptureProvider(realProvider?: SMSProvider): SMSProvider
```

- `realProvider` — Optional real provider to delegate to and tee.

**Returns:** An {@link SMSProvider} that records activity for every send.

### Constants

#### `provider`

Default SMS capture provider (intercept-only).

```typescript
const provider: SMSProvider
```

## Core Interface
Implements `@molecule/api-sms` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-sms'
import { provider } from '@molecule/api-sms-capture'

export function setupSmsCapture(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-activity` ^1.0.0
- `@molecule/api-sms` ^1.0.0

### Runtime Dependencies

- `@molecule/api-activity`
- `@molecule/api-sms`

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
