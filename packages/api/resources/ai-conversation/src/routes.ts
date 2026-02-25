/**
 * Conversation route definitions.
 *
 * Conversations are nested under projects — the chat endpoint streams
 * AI responses via SSE.
 *
 * @module
 */

/** Route array for conversation endpoints: POST chat (SSE streaming), GET history, DELETE clear. */
export const routes = [
  {
    method: 'post',
    path: '/projects/:projectId/chat',
    handler: 'chat',
    middlewares: ['authenticate'],
  },
  {
    method: 'get',
    path: '/projects/:projectId/chat',
    handler: 'history',
    middlewares: ['authenticate'],
  },
  {
    method: 'delete',
    path: '/projects/:projectId/chat',
    handler: 'clear',
    middlewares: ['authenticate'],
  },
] as const
