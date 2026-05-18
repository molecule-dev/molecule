import type { NotificationsPageTranslations } from './types.js'

/** NotificationsPage translations for gl. */
export const gl: Partial<NotificationsPageTranslations> = {
  'notificationsPage.filterAll': 'All ({{count}})',
  'notificationsPage.title': 'Notificacións',
  'notificationsPage.markAllRead': 'Marcos<x> {{conta}}</x> como lido',
  'notificationsPage.filterUnread': 'Sen ler',
  'notificationsPage.filterMentions': 'Mencións',
  'notificationsPage.filterAriaLabel': 'Filtrar notificacións',
  'notificationsPage.feedAriaLabel': 'Notificacións',
  'notificationsPage.loading': 'Cargando notificacións…',
  'notificationsPage.error': 'Non se puideron cargar as notificacións.',
  'notificationsPage.emptyTitle': 'Estás ao día',
  'notificationsPage.emptyBody': 'As novas notificacións aparecerán aquí.',
  'notificationsPage.paginationAriaLabel': 'Paxinación',
  'notificationsPage.pageOf': 'Páxina<x> {{actual}}</x> de<x> {{total}}</x>',
  'notificationsPage.prev': 'Anterior',
  'notificationsPage.next': 'Seguinte',
}
