import { get, getLogger } from '@molecule/api-bond'

const logger = getLogger()

/**
 * Sends push notifications to all of a user's devices except the current one. Retrieves devices
 * with active push subscriptions via the bonded DeviceService, then sends each notification via
 * `@molecule/api-push-notifications`. Silently no-ops if either dependency is unavailable.
 * @param options - Notification options.
 * @param options.userId - The user whose devices should receive the notification.
 * @param options.deviceId - The current device ID to exclude from notifications.
 * @param options.title - The notification title text.
 * @param options.titleKey - The i18n key for the title (sent as notification data for client-side localization).
 * @param options.body - The notification body text.
 * @param options.bodyKey - The i18n key for the body (sent as notification data for client-side localization).
 */
export const notify = async ({
  userId,
  deviceId,
  title,
  titleKey,
  body,
  bodyKey,
}: {
  userId: string
  deviceId?: string
  title: string
  titleKey?: string
  body: string
  bodyKey?: string
}): Promise<void> => {
  try {
    const pushNotifications = await import('@molecule/api-push-notifications').catch(() => null)
    if (!pushNotifications) return

    const deviceService = get<{
      getWithPushSubscription(
        userId: string,
      ): Promise<Array<{ id: string; pushSubscription: unknown }>>
    }>('device')
    if (!deviceService) return

    const devices = await deviceService.getWithPushSubscription(userId)

    for (const device of devices) {
      if (device.id === deviceId) continue

      try {
        await pushNotifications.send(
          device.pushSubscription as Parameters<typeof pushNotifications.send>[0],
          { title, options: { body, data: { titleKey, bodyKey } } },
        )
      } catch (error) {
        logger.error(`Failed to send push to device ${device.id}:`, error)
      }
    }
  } catch (error) {
    logger.error('notify error:', error)
  }
}
