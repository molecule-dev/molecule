import type { NotificationsPageTranslations } from './types.js'

/** NotificationsPage translations for ca. */
export const ca: Partial<NotificationsPageTranslations> = {
  'notificationsPage.filterAll': 'All ({{count}})',
  'notificationsPage.title': 'Notificacions',
  'notificationsPage.markAllRead': 'Marc<x> {{count}}</x> tal com es llegeix',
  'notificationsPage.filterUnread': 'No llegit',
  'notificationsPage.filterMentions': 'Mencions',
  'notificationsPage.filterAriaLabel': 'Filtrar notificacions',
  'notificationsPage.feedAriaLabel': 'Notificacions',
  'notificationsPage.loading': "S'estan carregant les notificacions…",
  'notificationsPage.error': "No s'han pogut carregar les notificacions.",
  'notificationsPage.emptyTitle': 'Estàs tot al dia',
  'notificationsPage.emptyBody': 'Les noves notificacions apareixeran aquí.',
  'notificationsPage.paginationAriaLabel': 'Paginació',
  'notificationsPage.pageOf': 'Pàgina<x> {{actual}}</x> de<x> {{total}}</x>',
  'notificationsPage.prev': 'Anterior',
  'notificationsPage.next': 'Següent',
}
