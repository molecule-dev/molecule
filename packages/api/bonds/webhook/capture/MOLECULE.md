# @molecule/api-webhook-capture

Webhook capture provider for molecule.dev.

Records every `dispatch()` call as an activity event. Intercept-only by
default; delegates + tees when wrapping a real provider.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-webhook'
import { provider } from '@molecule/api-webhook-capture'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-webhook-capture @molecule/api-activity @molecule/api-webhook
```

## API

### Functions

#### `createWebhookCaptureProvider(realProvider)`

Creates a webhook capture provider.

When `realProvider` is provided, each event is dispatched through it and the
captured event records the real outcome (delegate + tee). When omitted (the
dev default), dispatches are intercepted and a synthetic single-element
`WebhookDeliveryResult[]` is returned. Registration / log / retry methods
delegate to the real provider when present and otherwise return empty
intercept-only results.

```typescript
function createWebhookCaptureProvider(realProvider?: WebhookProvider): WebhookProvider
```

- `realProvider` — Optional real provider to delegate to and tee.

**Returns:** A {@link WebhookProvider} that records activity for every dispatch.

### Constants

#### `provider`

Default webhook capture provider (intercept-only).

```typescript
const provider: WebhookProvider
```

## Core Interface
Implements `@molecule/api-webhook` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-webhook'
import { provider } from '@molecule/api-webhook-capture'

export function setupWebhookCapture(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-activity` ^1.0.0
- `@molecule/api-webhook` ^1.0.0

### Runtime Dependencies

- `@molecule/api-activity`
- `@molecule/api-webhook`

- **Requires an activity sink to be useful:** captures go through
  `@molecule/api-activity`'s `record()`, which silently no-ops when no
  sink is bonded — wire `setSink()` (e.g. the console/database sink) or
  intercepted dispatches return synthetic success and leave no trace.
- Intercept-only mode returns a synthetic result (`status: 200,
  success: true`) with no HTTP delivery; `register()` returns
  `secret: ''` when `options.secret` is omitted (NO auto-generation,
  unlike the http/queue bonds), registrations are not remembered
  (`list()` → `[]`), and every dispatched event is recorded regardless
  of registrations.
- To capture AND really deliver, wrap a real provider:
  `setProvider(createWebhookCaptureProvider(createProvider()))` with
  `createProvider` from `@molecule/api-webhook-http`.

## E2E Tests

Integration checklist — drive the real UI (live preview, no mocks), adapt
each item to this app's actual screens/flows, and check every box off one
by one. A box you can't check is an integration bug to fix — not a skip:
- [ ] Registering a webhook endpoint through the app's UI/API succeeds, and
  an event the app dispatches actually produces a delivery. The sandbox
  CAPTURES outbound deliveries instead of POSTing — read them with the
  `read_activity` tool (filter type 'webhook'); never mock the dispatch or
  modify production code to expose the payload.
- [ ] The captured delivery carries the signature header (derived from the
  registration's secret), a stable delivery-id header the receiver can dedup
  on (at-least-once), and an event payload free of secrets/unrelated PII.
- [ ] A registration targeting a private/link-local/metadata destination
  (`localhost`, `10.…`, `169.254.169.254`) is REJECTED before any dispatch.
