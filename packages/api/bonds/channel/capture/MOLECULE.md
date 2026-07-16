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
npm install @molecule/api-channel-capture @molecule/api-activity @molecule/api-channel
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

### Runtime Dependencies

- `@molecule/api-activity`
- `@molecule/api-channel`

- **Bond an activity sink or captures vanish.** Captured sends are delivered
  via `@molecule/api-activity`'s `record()`, which silently no-ops when no
  sink is bonded. Wire one at startup (e.g. `@molecule/api-activity-console`
  or `-http`) before this provider, or every intercepted message is dropped
  with no trace.
- Intercept-only mode (no `realProvider`) returns a synthetic success from
  `sendMessage()`, always fails `verifyWebhookSignature()` (`false`), and
  `parseInbound()` returns a stub — inbound webhook flows need a real
  provider wrapped via `createChannelCaptureProvider(realProvider)`.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Each channel-notifying flow the app defines (a Slack/Discord alert on
  a new order, a status-change message) actually produces a message. The
  sandbox CAPTURES channel messages instead of sending — read them with the
  `read_activity` tool (filter type 'channel'); never mock the flow or
  modify production code to expose the message.
- [ ] The captured message targets the configured channel/provider name and
  carries the app's real content (readable text, no `undefined`
  placeholders, no secrets).
- [ ] A failed send (unbonded or misconfigured provider) is visible in
  logs/UI — never silently swallowed.
