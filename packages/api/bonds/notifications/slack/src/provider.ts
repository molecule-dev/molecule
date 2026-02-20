/**
 * Slack notifications provider.
 *
 * Sends notifications to a Slack channel via incoming webhook.
 *
 * @module
 */

import type {
  Notification,
  NotificationResult,
  NotificationsProvider,
} from '@molecule/api-notifications'

import type { SlackConfig } from './types.js'

/**
 * Creates a Slack notifications provider.
 *
 * @param config - Optional configuration.
 * @returns A NotificationsProvider that sends via Slack webhook.
 */
export const createProvider = (config?: SlackConfig): NotificationsProvider => {
  const webhookUrl = config?.webhookUrl ?? process.env.NOTIFICATIONS_SLACK_WEBHOOK_URL
  const timeoutMs = config?.timeoutMs ?? 10000

  return {
    name: 'slack',

    async send(notification: Notification): Promise<NotificationResult> {
      if (!webhookUrl) {
        return { success: false, error: 'Slack webhook URL not configured.' }
      }

      const payload = JSON.stringify({
        text: `*${notification.subject}*\n${notification.body}`,
      })

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)

      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          signal: controller.signal,
        })
        clearTimeout(timer)

        if (!response.ok) {
          return { success: false, error: `Slack returned HTTP ${response.status}` }
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
