/**
 * Notification route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express router.
 *
 * @module
 */

/**
 * Route definitions for the notification resource.
 */
export const routes = [
  { method: 'get', path: '/notifications', handler: 'list' },
  { method: 'get', path: '/notifications/unread-count', handler: 'unreadCount' },
  { method: 'get', path: '/notifications/preferences', handler: 'getPreferences' },
  { method: 'post', path: '/notifications/:id/read', handler: 'markRead' },
  { method: 'post', path: '/notifications/read-all', handler: 'markAllRead' },
  { method: 'put', path: '/notifications/preferences', handler: 'updatePreferences' },
  { method: 'delete', path: '/notifications/:id', handler: 'del' },
] as const
