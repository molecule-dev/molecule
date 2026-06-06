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
 * @module
 */

export * from './WebhookInspector.js'
