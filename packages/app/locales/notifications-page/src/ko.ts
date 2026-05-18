import type { NotificationsPageTranslations } from './types.js'

/** NotificationsPage translations for ko. */
export const ko: Partial<NotificationsPageTranslations> = {
  'notificationsPage.title': '알림',
  'notificationsPage.markAllRead': '{{count}}개 모두 읽음으로 표시',
  'notificationsPage.filterAll': '전체',
  'notificationsPage.filterUnread': '읽지 않음',
  'notificationsPage.filterMentions': '멘션',
  'notificationsPage.filterAriaLabel': '알림 필터',
  'notificationsPage.feedAriaLabel': '알림',
  'notificationsPage.loading': '알림을 불러오는 중…',
  'notificationsPage.error': '알림을 불러올 수 없습니다.',
  'notificationsPage.emptyTitle': '모두 확인하셨습니다',
  'notificationsPage.emptyBody': '새 알림이 여기에 표시됩니다.',
  'notificationsPage.prev': '이전',
  'notificationsPage.next': '다음',
  'notificationsPage.paginationAriaLabel': '쪽수 매기기',
  'notificationsPage.pageOf': '페이지<x> {{현재의}}</x> ~의<x> {{총}}</x>',
}
