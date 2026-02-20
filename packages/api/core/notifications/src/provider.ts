/**
 * Notifications provider bond accessor and convenience functions.
 *
 * Notifications use named bonds — multiple channels can be registered:
 * bond('notifications', 'webhook', provider)
 * bond('notifications', 'slack', provider)
 *
 * @module
 */

import { bond, get as bondGet, getAll, isBonded } from '@molecule/api-bond'
import { getLogger } from '@molecule/api-bond'
import { t } from '@molecule/api-i18n'

import type { Notification, NotificationResult, NotificationsProvider } from './types.js'

const BOND_TYPE = 'notifications'

/**
 * Registers a notifications provider under its channel name.
 *
 * @param name - The channel name (e.g. 'webhook', 'slack').
 * @param provider - The provider implementation.
 */
export const setProvider = (name: string, provider: NotificationsProvider): void => {
  bond(BOND_TYPE, name, provider)
}

/**
 * Retrieves a specific notifications provider by channel name.
 *
 * @param name - The channel name.
 * @returns The provider, or null if not bonded.
 */
export const getProvider = (name: string): NotificationsProvider | null => {
  return bondGet<NotificationsProvider>(BOND_TYPE, name) ?? null
}

/**
 * Checks whether any notifications provider is bonded.
 *
 * @returns true if at least one provider is bonded.
 */
export const hasProvider = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Returns all bonded notification providers.
 *
 * @returns Map of channel name to provider.
 */
export const getAllProviders = (): Map<string, NotificationsProvider> => {
  return getAll<NotificationsProvider>(BOND_TYPE)
}

/**
 * Sends a notification through ALL bonded channels. Failures in one channel
 * do not prevent other channels from being tried. Errors are logged, not thrown.
 *
 * @param notification - The notification to send.
 * @returns Array of results, one per channel.
 */
export const notifyAll = async (notification: Notification): Promise<NotificationResult[]> => {
  const providers = getAll<NotificationsProvider>(BOND_TYPE)
  const logger = getLogger()

  if (providers.size === 0) {
    logger.warn(
      t('notifications.warn.noProviders', undefined, {
        defaultValue: 'No notification providers configured. Notification not sent.',
      }),
    )
    return []
  }

  const results: NotificationResult[] = []

  for (const [name, provider] of providers) {
    const sentAt = new Date().toISOString()
    try {
      const result = await provider.send(notification)
      results.push({ ...result, channel: name, sentAt })
      if (!result.success) {
        logger.warn(`Notification channel '${name}' failed: ${result.error}`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`Notification channel '${name}' threw: ${message}`)
      results.push({ success: false, error: message, channel: name, sentAt })
    }
  }

  return results
}
