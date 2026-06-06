# @molecule/api-emails-capture

Email capture provider for molecule.dev.

Records every `sendMail()` call as an activity event. Intercept-only by
default (synthetic success); delegates + tees when wrapping a real transport.

## Quick Start

```typescript
import { setTransport } from '@molecule/api-emails'
import { provider } from '@molecule/api-emails-capture'

setTransport(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-emails-capture
```

## API

### Functions

#### `createEmailCaptureProvider(realTransport)`

Creates an email capture transport.

When `realTransport` is provided, each message is delivered through it and
the captured event records the real outcome (delegate + tee). When omitted
(the dev default), messages are intercepted and a synthetic success result
is returned.

```typescript
function createEmailCaptureProvider(realTransport?: EmailTransport): EmailTransport
```

- `realTransport` — Optional real transport to delegate to and tee.

**Returns:** An {@link EmailTransport} that records activity for every send.

### Constants

#### `provider`

Default email capture transport (intercept-only).

```typescript
const provider: EmailTransport
```

## Core Interface
Implements `@molecule/api-emails` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setTransport } from '@molecule/api-emails'
import { provider } from '@molecule/api-emails-capture'

export function setupEmailsCapture(): void {
  setTransport(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-activity` ^1.0.0
- `@molecule/api-emails` ^1.0.0
