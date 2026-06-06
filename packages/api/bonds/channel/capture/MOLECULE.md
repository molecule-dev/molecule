# @molecule/api-channel-capture

Channel capture provider for molecule.dev.

Records every `sendMessage()` call as an activity event. Intercept-only by
default; delegates + tees when wrapping a real provider.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-channel'
import { provider } from '@molecule/api-channel-capture'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-channel-capture
```

## API

### Functions

#### `createChannelCaptureProvider(realProvider)`

Creates a channel capture provider.

When `realProvider` is provided, each message is posted through it and the
captured event records the real outcome (delegate + tee). When omitted (the
dev default), messages are intercepted and a synthetic `SendResult` is
returned. Inbound / signature / feature methods delegate to the real
provider when present and otherwise return intercept-only defaults.

```typescript
function createChannelCaptureProvider(realProvider?: ChannelProvider): ChannelProvider
```

- `realProvider` — Optional real provider to delegate to and tee.

**Returns:** A {@link ChannelProvider} that records activity for every send.

### Constants

#### `provider`

Default channel capture provider (intercept-only).

```typescript
const provider: ChannelProvider
```

## Core Interface
Implements `@molecule/api-channel` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-channel'
import { provider } from '@molecule/api-channel-capture'

export function setupChannelCapture(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-activity` ^1.0.0
- `@molecule/api-channel` ^1.0.0
