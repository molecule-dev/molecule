/**
 * Webhook notifications provider.
 *
 * Sends notifications as HTTP POST requests with JSON body and optional HMAC signing.
 *
 * @module
 */

import { createHmac } from 'node:crypto'

// Side-effect import: registers this bond's secret definitions so the
// runtime registry is populated even when provider.js is imported directly
// (not through the package barrel).
import './secrets.js'

import type {
  Notification,
  NotificationResult,
  NotificationsProvider,
} from '@molecule/api-notifications'

import type { WebhookConfig } from './types.js'

/**
 * Creates a webhook notifications provider.
 *
 * @param config - Optional configuration.
 * @returns A NotificationsProvider that sends via HTTP webhook.
 */
export const createProvider = (config?: WebhookConfig): NotificationsProvider => {
  const url = config?.url ?? process.env.NOTIFICATIONS_WEBHOOK_URL
  const secret = config?.secret ?? process.env.NOTIFICATIONS_WEBHOOK_SECRET
  const timeoutMs = config?.timeoutMs ?? 10000

  return {
    name: 'webhook',

    async send(notification: Notification): Promise<NotificationResult> {
      if (!url) {
        return { success: false, error: 'Webhook URL not configured.' }
      }

      // `metadata` is nested under its own key rather than spread at the top
      // level — a top-level spread let metadata keys named subject/body/
      // timestamp silently OVERWRITE the canonical envelope fields on the
      // wire, so a receiver (including one verifying the HMAC signature)
      // couldn't trust which value was authoritative.
      const body = JSON.stringify({
        subject: notification.subject,
        body: notification.body,
        timestamp: new Date().toISOString(),
        metadata: notification.metadata,
      })

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (secret) {
        const signature = createHmac('sha256', secret).update(body).digest('hex')
        headers['X-Signature-256'] = `sha256=${signature}`
      }

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body,
          signal: controller.signal,
        })
        clearTimeout(timer)

        if (!response.ok) {
          return { success: false, error: `Webhook returned HTTP ${response.status}` }
        }

        return { success: true }
      } catch (error) {
        clearTimeout(timer)
        const message = error instanceof Error ? error.message : String(error)
        return { success: false, error: message }
      }
    },
  }
}
