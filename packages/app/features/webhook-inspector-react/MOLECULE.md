# @molecule/app-webhook-inspector-react

Webhook delivery-log inspector.

Exports `<WebhookInspector>` and `WebhookDelivery` type.

## Quick Start

```tsx
import { WebhookInspector } from '@molecule/app-webhook-inspector-react'
import type { WebhookDelivery } from '@molecule/app-webhook-inspector-react'

const deliveries: WebhookDelivery[] = [
  { id: '1', eventType: 'payment.succeeded', timestamp: '2 min ago', statusCode: 200, status: 'success', durationMs: 142 },
  { id: '2', eventType: 'invoice.failed', timestamp: '5 min ago', statusCode: 500, status: 'failure', attempt: 2 },
]

<WebhookInspector
  deliveries={deliveries}
  selectedId="1"
  onSelect={(d) => console.log('selected', d.id)}
  onRetry={(d) => console.log('retry', d.id)}
/>
```

## Type
`feature`

## Installation
```bash
npm install @molecule/app-webhook-inspector-react
```

## API

### Interfaces

#### `WebhookDelivery`

Shape of a single webhook delivery attempt shown in the inspector.

```typescript
interface WebhookDelivery {
  id: string
  /** Event type name (e.g. "payment.succeeded"). */
  eventType: string
  /** ISO timestamp or formatted string. */
  timestamp: ReactNode
  /** Response status. */
  statusCode: number
  /** Success / failure / pending. */
  status: 'success' | 'failure' | 'pending'
  /** Latency in ms. */
  durationMs?: number
  /** Request payload (string or JSON). */
  requestBody?: string | unknown
  /** Response body. */
  responseBody?: string | unknown
  /** Optional attempt number. */
  attempt?: number
}
```

### Functions

#### `WebhookInspector(root0, root0, root0, root0, root0, root0)`

Webhook delivery log — one row per event with expandable
request/response JSON panels. Pass `onRetry` to show a retry button
per failed delivery.

```typescript
function WebhookInspector({
  deliveries,
  onRetry,
  onSelect,
  selectedId,
  className,
}: WebhookInspectorProps): ReactNode
```

- `root0` — *
- `root0` — .deliveries
- `root0` — .onRetry
- `root0` — .onSelect
- `root0` — .selectedId
- `root0` — .className

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0
