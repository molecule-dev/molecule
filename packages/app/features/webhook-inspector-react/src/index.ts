/**
 * Webhook delivery-log inspector.
 *
 * Exports `<WebhookInspector>` and `WebhookDelivery` type.
 *
 * @example
 * ```tsx
 * import { WebhookInspector } from '@molecule/app-webhook-inspector-react'
 * import type { WebhookDelivery } from '@molecule/app-webhook-inspector-react'
 *
 * const deliveries: WebhookDelivery[] = [
 *   { id: '1', eventType: 'payment.succeeded', timestamp: '2 min ago', statusCode: 200, status: 'success', durationMs: 142 },
 *   { id: '2', eventType: 'invoice.failed', timestamp: '5 min ago', statusCode: 500, status: 'failure', attempt: 2 },
 * ]
 *
 * <WebhookInspector
 *   deliveries={deliveries}
 *   selectedId="1"
 *   onSelect={(d) => console.log('selected', d.id)}
 *   onRetry={(d) => console.log('retry', d.id)}
 * />
 * ```
 *
 * @remarks
 * Presentation-only: fetch and store deliveries yourself and pass them in —
 * there is no server contract beyond the `WebhookDelivery` shape, and
 * `onRetry` only invokes your callback (the button renders per-row when
 * `status === 'failure'`). The 'Retry', 'Request' and 'Response' labels are
 * hardcoded English with no locale bond. Status pills use hardcoded hex
 * (#22c55e success / #ef4444 failure / #eab308 pending) with white text,
 * independent of theme. Rows are native `<details>` elements and `onSelect`
 * fires on EVERY toggle — opening and closing alike. Non-string
 * request/response bodies render via JSON.stringify(v, null, 2). Props
 * (documented on the exported `WebhookInspectorProps` interface):
 * deliveries, onRetry, onSelect, selectedId, className.
 *
 * @module
 */

export * from './WebhookInspector.js'
