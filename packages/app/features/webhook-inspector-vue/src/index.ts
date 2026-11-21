/**
 * Vue webhook delivery-log inspector.
 *
 * Exports `<WebhookInspector>` and the `WebhookDelivery` type.
 *
 * @example
 * ```ts
 * import { defineComponent, h, ref } from 'vue'
 *
 * import { WebhookInspector, type WebhookDelivery } from '@molecule/app-webhook-inspector-vue'
 *
 * const deliveries: WebhookDelivery[] = [
 *   { id: '1', eventType: 'payment.succeeded', timestamp: '2 min ago', statusCode: 200, status: 'success', durationMs: 142 },
 *   { id: '2', eventType: 'invoice.failed', timestamp: '5 min ago', statusCode: 500, status: 'failure', attempt: 2 },
 * ]
 *
 * export const Payments = defineComponent({
 *   setup() {
 *     const selectedId = ref('1')
 *     return () =>
 *       h(WebhookInspector, {
 *         deliveries,
 *         selectedId: selectedId.value,
 *         onSelect: (d) => console.log('selected', d.id),
 *         onRetry: (d) => console.log('retry', d.id),
 *       })
 *   },
 * })
 * ```
 *
 * @remarks
 * Presentation-only: fetch and store deliveries yourself and pass them in —
 * there is no server contract beyond the `WebhookDelivery` shape, and
 * `onRetry` only invokes your callback (the button renders per-row when
 * `status === 'failure'`). The 'Retry', 'Request' and 'Response' labels route
 * through `t()` under `webhookInspector.*`, translated by the
 * `@molecule/app-locales-webhook-inspector` companion bond, and are read
 * through the binding's `useTranslation()` so a locale switch re-renders them.
 * Status pills take their colour from the theme's semantic tones (success /
 * error / warning) through the ClassMap, with the theme's on-tone text. Rows
 * are native `<details>` elements and `onSelect` fires on EVERY toggle —
 * opening and closing alike.
 * Non-string request/response bodies render via `JSON.stringify(v, null, 2)`.
 * Props (documented on the exported `WebhookInspectorProps` interface):
 * deliveries, onRetry, onSelect, selectedId, className.
 *
 * @module
 */

export * from './types.js'
export * from './WebhookInspector.js'
