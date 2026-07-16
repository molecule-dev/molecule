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
npm install @molecule/app-webhook-inspector-react @molecule/app-react @molecule/app-ui @molecule/app-ui-react react
npm install -D @types/react
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

#### `WebhookInspectorProps`

Props for the {@link WebhookInspector} component.

```typescript
interface WebhookInspectorProps {
  /** Deliveries to render. */
  deliveries: WebhookDelivery[]
  /** Called when a delivery is retried. */
  onRetry?: (delivery: WebhookDelivery) => void
  /** Called when a row is selected (for external detail panel). */
  onSelect?: (delivery: WebhookDelivery) => void
  /** Currently selected id. */
  selectedId?: string
  /** Extra classes. */
  className?: string
}
```

### Functions

#### `WebhookInspector(props)`

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

- `props` — Component props (see {@link WebhookInspectorProps}).

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/app-react` ^1.0.0
- `@molecule/app-ui` ^1.0.0
- `@molecule/app-ui-react` ^1.0.0
- `react` ^18.0.0 || ^19.0.0

### Runtime Dependencies

- `@molecule/app-react`
- `@molecule/app-ui`
- `@molecule/app-ui-react`
- `react`

Presentation-only: fetch and store deliveries yourself and pass them in —
there is no server contract beyond the `WebhookDelivery` shape, and
`onRetry` only invokes your callback (the button renders per-row when
`status === 'failure'`). The 'Retry', 'Request' and 'Response' labels are
hardcoded English with no locale bond. Status pills use hardcoded hex
(#22c55e success / #ef4444 failure / #eab308 pending) with white text,
independent of theme. Rows are native `<details>` elements and `onSelect`
fires on EVERY toggle — opening and closing alike. Non-string
request/response bodies render via JSON.stringify(v, null, 2). Props
(documented on the exported `WebhookInspectorProps` interface):
deliveries, onRetry, onSelect, selectedId, className.
