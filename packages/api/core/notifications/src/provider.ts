/**
 * Notifications provider bond accessor and convenience functions.
 *
 * Notifications use named bonds — multiple channels can be registered:
 * bond('notifications', 'webhook', provider)
 * bond('notifications', 'slack', provider)
 *
 * @module
 */

import { bond, get as bondGet, getAll } from '@molecule/api-bond'
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
 * Notification channels are NAMED bonds (`bond('notifications', name, provider)`),
 * so this checks the named-provider map. (`isBonded('notifications')` alone checks
 * the singleton map and would always report `false` here — a channel registered
 * via {@link setProvider} never appears there.)
 *
 * @returns true if at least one provider is bonded.
 */
export const hasProvider = (): boolean => {
  return getAll<NotificationsProvider>(BOND_TYPE).size > 0
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
 * Sends a notification through ALL bonded channels CONCURRENTLY (via
 * `Promise.allSettled`), so one slow/hanging channel cannot delay every
 * other channel behind it. Failures in one channel do not prevent other
 * channels from being tried. Errors are logged, not thrown. Results are
 * reassembled in registration (Map insertion) order regardless of which
 * channel settles first.
 *
 * @param notification - The notification to send.
 * @returns Array of results, one per channel, in registration order.
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

  const entries = [...providers.entries()]
  const sentAt = new Date().toISOString()
  const settled = await Promise.allSettled(
    entries.map(([, provider]) => provider.send(notification)),
  )

  return entries.map(([name], i) => {
    const outcome = settled[i]

    if (outcome.status === 'fulfilled') {
      const result = outcome.value
      if (!result.success) {
        logger.warn(`Notification channel '${name}' failed: ${result.error}`)
      }
      return { ...result, channel: name, sentAt }
    }

    const message =
      outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason)
    logger.error(`Notification channel '${name}' threw: ${message}`)
    return { success: false, error: message, channel: name, sentAt }
  })
}
