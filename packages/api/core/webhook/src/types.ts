/**
 * Webhook core types for molecule.dev.
 *
 * Defines the standard interfaces for webhook dispatch providers.
 *
 * @module
 */

/**
 * Options for registering a webhook endpoint.
 */
export interface WebhookOptions {
  /** Shared secret used to sign webhook payloads. Auto-generated if omitted. */
  secret?: string

  /** Custom HTTP headers to include with every delivery. */
  headers?: Record<string, string>

  /** Number of automatic retries on delivery failure (default: 3). */
  retryCount?: number
}

/**
 * A registered webhook endpoint.
 */
export interface WebhookRegistration {
  /** Provider-assigned webhook identifier. */
  id: string

  /** Destination URL that receives webhook payloads. */
  url: string

  /** Event types this webhook is subscribed to. */
  events: string[]

  /** Shared secret used to sign payloads for this webhook. */
  secret: string

  /** Whether this webhook is currently active. */
  active: boolean

  /** When this webhook was registered. */
  createdAt: Date
}

/**
 * Result of delivering a webhook payload to a single endpoint.
 */
export interface WebhookDeliveryResult {
  /** The webhook this delivery was sent to. */
  webhookId: string

  /** Provider-assigned delivery attempt identifier. */
  deliveryId: string

  /** HTTP status code returned by the receiver. */
  status: number

  /** Whether the delivery was successful (2xx response). */
  success: boolean

  /** Round-trip delivery time in milliseconds. */
  duration: number
}

/**
 * A recorded webhook delivery attempt.
 */
export interface WebhookDelivery {
  /** Provider-assigned delivery identifier. */
  id: string

  /** The webhook this delivery belongs to. */
  webhookId: string

  /** The event type that triggered this delivery. */
  event: string

  /** The payload that was delivered. */
  payload: unknown

  /** HTTP status code returned by the receiver. */
  status: number

  /** Whether the delivery was successful (2xx response). */
  success: boolean

  /** Round-trip delivery time in milliseconds. */
  duration: number

  /** When this delivery attempt occurred. */
  createdAt: Date
}

/**
 * Pagination options for listing webhook deliveries.
 */
export interface PaginationOptions {
  /** Maximum number of results to return. */
  limit?: number

  /** Number of results to skip. */
  offset?: number
}

/**
 * Webhook provider interface.
 *
 * All webhook providers must implement this interface to provide
 * registration, dispatch, delivery logging, and retry capabilities.
 */
export interface WebhookProvider {
  /**
   * Registers a new webhook endpoint to receive event notifications.
   *
   * @param url - Destination URL that will receive POST requests.
   * @param events - Event types to subscribe to.
   * @param options - Optional registration configuration.
   * @returns The created webhook registration.
   */
  register(url: string, events: string[], options?: WebhookOptions): Promise<WebhookRegistration>

  /**
   * Removes a webhook registration, stopping all future deliveries.
   *
   * @param webhookId - The webhook to unregister.
   */
  unregister(webhookId: string): Promise<void>

  /**
   * Dispatches an event payload to all webhooks subscribed to the event.
   *
   * @param event - The event type being dispatched.
   * @param payload - The event payload to deliver.
   * @returns Delivery results for each matching webhook.
   */
  dispatch(event: string, payload: unknown): Promise<WebhookDeliveryResult[]>

  /**
   * Lists all registered webhooks.
   *
   * @returns All webhook registrations.
   */
  list(): Promise<WebhookRegistration[]>

  /**
   * Retrieves the delivery log for a specific webhook.
   *
   * @param webhookId - The webhook to retrieve deliveries for.
   * @param options - Pagination options.
   * @returns Delivery attempts for the webhook.
   */
  getDeliveryLog(webhookId: string, options?: PaginationOptions): Promise<WebhookDelivery[]>

  /**
   * Retries a previously failed delivery attempt.
   *
   * @param deliveryId - The delivery attempt to retry.
   * @returns The result of the retry attempt.
   */
  retry(deliveryId: string): Promise<WebhookDeliveryResult>
}
