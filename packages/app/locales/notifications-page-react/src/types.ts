/**
 * Translation key types for `@molecule/app-notifications-page-react`.
 *
 * @module
 */

/** Translation keys consumed by the notifications page. */
export type NotificationsPageTranslationKey =
  | 'notificationsPage.title'
  | 'notificationsPage.markAllRead'
  | 'notificationsPage.filterAll'
  | 'notificationsPage.filterUnread'
  | 'notificationsPage.filterMentions'
  | 'notificationsPage.filterAriaLabel'
  | 'notificationsPage.feedAriaLabel'
  | 'notificationsPage.loading'
  | 'notificationsPage.error'
  | 'notificationsPage.emptyTitle'
  | 'notificationsPage.emptyBody'
  | 'notificationsPage.paginationAriaLabel'
  | 'notificationsPage.pageOf'
  | 'notificationsPage.prev'
  | 'notificationsPage.next'

/** Translation record mapping notifications-page keys to translated strings. */
export type NotificationsPageTranslations = Record<NotificationsPageTranslationKey, string>
