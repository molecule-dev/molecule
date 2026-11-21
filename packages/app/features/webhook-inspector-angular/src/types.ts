/**
 * Types for the Angular webhook inspector — the Angular counterpart of
 * `@molecule/app-webhook-inspector-react`'s types, same props and DOM.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/**
 * A node-valued delivery field (React's `ReactNode`): in Angular a field is
 * text (a string or number) or an `ng-template` reference rendered through
 * `NgTemplateOutlet` where the node would render.
 */
type WebhookDeliveryNode = TemplateRef<unknown> | string | number

/** Shape of a single webhook delivery attempt shown in the inspector. */
export interface WebhookDelivery {
  id: string
  /** Event type name (e.g. "payment.succeeded"). */
  eventType: string
  /** ISO timestamp or formatted string (React's `ReactNode`). */
  timestamp: WebhookDeliveryNode
  /** Response status. */
  statusCode: number
  /** Success / failure / pending. */
  status: 'success' | 'failure' | 'pending'
  /** Latency in ms. */
  durationMs?: number
  /** Request payload (string or JSON). */
  requestBody?: string | unknown
  /** Response body (string or JSON). */
  responseBody?: string | unknown
  /** Optional attempt number. */
  attempt?: number
}

/** Props accepted by {@link WebhookInspector} — the same props its React counterpart accepts. */
export interface WebhookInspectorProps {
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
