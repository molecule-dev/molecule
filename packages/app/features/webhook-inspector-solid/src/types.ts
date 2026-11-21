/**
 * Types for the Solid webhook inspector — the Solid counterpart of
 * `@molecule/app-webhook-inspector-react`'s types, same props and DOM.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Shape of a single webhook delivery attempt shown in the inspector. */
export interface WebhookDelivery {
  id: string
  /** Event type name (e.g. "payment.succeeded"). */
  eventType: string
  /** ISO timestamp or formatted string (React's `ReactNode`: text, or a node). */
  timestamp: JSX.Element
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

/** Props for {@link WebhookInspector}. */
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
