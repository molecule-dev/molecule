/**
 * Message resource route definitions.
 *
 * Declarative routing — `mlcl inject` reads these to generate the
 * Express router.
 *
 * @module
 */

/**
 * Routes for 1:1 message threads, messages, and read-tracking.
 */
export const routes = [
  {
    method: 'post',
    path: '/message-threads',
    handler: 'createThread',
    middlewares: ['authenticate'],
  },
  {
    method: 'get',
    path: '/message-threads',
    handler: 'listThreads',
    middlewares: ['authenticate'],
  },
  {
    method: 'get',
    path: '/message-threads/unread-count',
    handler: 'unreadCount',
    middlewares: ['authenticate'],
  },
  {
    method: 'get',
    path: '/message-threads/:threadId',
    handler: 'readThread',
    middlewares: ['authenticate'],
  },
  {
    method: 'get',
    path: '/message-threads/:threadId/messages',
    handler: 'listMessages',
    middlewares: ['authenticate'],
  },
  {
    method: 'post',
    path: '/message-threads/:threadId/messages',
    handler: 'sendMessage',
    middlewares: ['authenticate'],
  },
  {
    method: 'post',
    path: '/message-threads/:threadId/read',
    handler: 'markRead',
    middlewares: ['authenticate'],
  },
  {
    method: 'patch',
    path: '/message-threads/messages/:messageId',
    handler: 'editMessage',
    middlewares: ['authenticate'],
  },
  {
    method: 'delete',
    path: '/message-threads/messages/:messageId',
    handler: 'deleteMessage',
    middlewares: ['authenticate'],
  },
] as const
