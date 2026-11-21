/**
 * Angular webhook delivery-log inspector — the counterpart of
 * `@molecule/app-webhook-inspector-react`: the same props and the same DOM for
 * the same input.
 *
 * Exports `<WebhookInspector>` — one `<details>` row per delivery: a fixed
 * 80px timestamp box, a colored status-code badge, the event type, optional
 * `#attempt` / `{durationMs}ms` labels, and a retry button on failed rows when
 * `onRetry` is given; expanding to the request and response JSON panels. Props:
 * `deliveries`, `onRetry`, `onSelect`, `selectedId`, `className`.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import {
 *   WebhookInspector,
 *   type WebhookDelivery,
 * } from '@molecule/app-webhook-inspector-angular'
 *
 * @Component({
 *   selector: 'app-payments',
 *   standalone: true,
 *   imports: [WebhookInspector],
 *   template: `
 *     <div
 *       mol-webhook-inspector
 *       [deliveries]="deliveries"
 *       [selectedId]="selectedId"
 *       [onSelect]="onSelect"
 *       [onRetry]="onRetry"
 *     ></div>
 *   `,
 * })
 * export class Payments {
 *   deliveries: WebhookDelivery[] = [
 *     { id: '1', eventType: 'payment.succeeded', timestamp: '2 min ago', statusCode: 200, status: 'success', durationMs: 142 },
 *     { id: '2', eventType: 'invoice.failed', timestamp: '5 min ago', statusCode: 500, status: 'failure', attempt: 2 },
 *   ]
 *   selectedId = '1'
 *   onSelect = (d: WebhookDelivery): void => console.log('selected', d.id)
 *   onRetry = (d: WebhookDelivery): void => console.log('retry', d.id)
 * }
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
 * A node-valued `timestamp` is an `ng-template` reference (pass
 * `[timestamp]="tpl"` from a row's host), or plain text.
 *
 * @module
 */

export * from './types.js'
export * from './webhook-inspector.component.js'
