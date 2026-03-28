/**
 * Thread route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express router.
 *
 * @module
 */

/**
 * Routes for thread CRUD, messages, and read-tracking.
 */
export const routes = [
  { method: 'post', path: '/threads', handler: 'create', middlewares: ['authenticate'] },
  { method: 'get', path: '/threads', handler: 'list', middlewares: ['authenticate'] },
  { method: 'get', path: '/threads/unread', handler: 'unread', middlewares: ['authenticate'] },
  { method: 'get', path: '/threads/:threadId', handler: 'read' },
  {
    method: 'patch',
    path: '/threads/:threadId',
    handler: 'update',
    middlewares: ['authenticate'],
  },
  {
    method: 'delete',
    path: '/threads/:threadId',
    handler: 'del',
    middlewares: ['authenticate'],
  },
  { method: 'get', path: '/threads/:threadId/messages', handler: 'listMessages' },
  {
    method: 'post',
    path: '/threads/:threadId/messages',
    handler: 'createMessage',
    middlewares: ['authenticate'],
  },
  {
    method: 'put',
    path: '/threads/messages/:messageId',
    handler: 'updateMsg',
    middlewares: ['authenticate'],
  },
  {
    method: 'delete',
    path: '/threads/messages/:messageId',
    handler: 'deleteMsg',
    middlewares: ['authenticate'],
  },
  {
    method: 'post',
    path: '/threads/:threadId/read',
    handler: 'markThreadRead',
    middlewares: ['authenticate'],
  },
] as const
