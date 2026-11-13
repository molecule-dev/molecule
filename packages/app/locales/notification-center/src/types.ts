/** Translation keys for the notification-center locale package. */
export type NotificationCenterTranslationKey =
  | 'notifications.title'
  | 'notifications.markAllRead'
  | 'notifications.empty'
  | 'notifications.viewAll'
  | 'notifications.loadError'
  | 'notifications.retry'

/** Translation record mapping notification-center-react keys to translated strings. */
export type NotificationCenterTranslations = Record<NotificationCenterTranslationKey, string>
