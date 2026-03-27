/**
 * Webhook convenience functions that delegate to the bonded provider.
 *
 * @module
 */

import { getProvider } from './provider.js'
import type {
  PaginationOptions,
  WebhookDelivery,
  WebhookDeliveryResult,
  WebhookOptions,
  WebhookRegistration,
} from './types.js'

/**
 * Registers a new webhook endpoint to receive event notifications.
 *
 * @param url - Destination URL that will receive POST requests.
 * @param events - Event types to subscribe to.
 * @param options - Optional registration configuration.
 * @returns The created webhook registration.
 * @throws {Error} If no webhook provider has been bonded.
 */
export const register = async (
  url: string,
  events: string[],
  options?: WebhookOptions,
): Promise<WebhookRegistration> => {
  return getProvider().register(url, events, options)
}

/**
 * Removes a webhook registration, stopping all future deliveries.
 *
 * @param webhookId - The webhook to unregister.
 * @returns Resolves when the webhook has been unregistered.
 * @throws {Error} If no webhook provider has been bonded.
 */
export const unregister = async (webhookId: string): Promise<void> => {
  return getProvider().unregister(webhookId)
}

/**
 * Dispatches an event payload to all webhooks subscribed to the event.
 *
 * @param event - The event type being dispatched.
 * @param payload - The event payload to deliver.
 * @returns Delivery results for each matching webhook.
 * @throws {Error} If no webhook provider has been bonded.
 */
export const dispatch = async (
  event: string,
  payload: unknown,
): Promise<WebhookDeliveryResult[]> => {
  return getProvider().dispatch(event, payload)
}

/**
 * Lists all registered webhooks.
 *
 * @returns All webhook registrations.
 * @throws {Error} If no webhook provider has been bonded.
 */
export const list = async (): Promise<WebhookRegistration[]> => {
  return getProvider().list()
}

/**
 * Retrieves the delivery log for a specific webhook.
 *
 * @param webhookId - The webhook to retrieve deliveries for.
 * @param options - Pagination options.
 * @returns Delivery attempts for the webhook.
 * @throws {Error} If no webhook provider has been bonded.
 */
export const getDeliveryLog = async (
  webhookId: string,
  options?: PaginationOptions,
): Promise<WebhookDelivery[]> => {
  return getProvider().getDeliveryLog(webhookId, options)
}

/**
 * Retries a previously failed delivery attempt.
 *
 * @param deliveryId - The delivery attempt to retry.
 * @returns The result of the retry attempt.
 * @throws {Error} If no webhook provider has been bonded.
 */
export const retry = async (deliveryId: string): Promise<WebhookDeliveryResult> => {
  return getProvider().retry(deliveryId)
}
