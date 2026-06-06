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
npm install @molecule/api-sms-capture
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
