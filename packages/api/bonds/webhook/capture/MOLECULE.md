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
npm install @molecule/api-webhook-capture
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
