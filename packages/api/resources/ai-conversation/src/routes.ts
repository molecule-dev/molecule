/**
 * Conversation route definitions.
 *
 * Conversations are nested under projects — the chat endpoint streams
 * AI responses via SSE.
 *
 * @module
 */

/**
 * Route array for conversation endpoints: POST chat (SSE streaming), GET history, DELETE clear.
 *
 * All three are gated by `authUser`, the object-level authorization middleware
 * (see `authorizers/authUser.ts`) that fails closed — it requires an authenticated
 * session AND verifies the caller owns `:projectId`, 401/403ing otherwise. It is a
 * key of `requestHandlerMap`, so the codegen scanner keeps it (a bare
 * `'authenticate'` token that isn't a handler key was being stripped, shipping
 * these routes UNGATED: unauthenticated AI cost abuse + cross-tenant IDOR). The
 * handlers also re-check ownership inline (`ensureProjectAccess`) so they stay
 * secure even if a middleware is dropped.
 */
export const routes = [
  {
    method: 'post',
    path: '/projects/:projectId/chat',
    handler: 'chat',
    middlewares: ['authUser'],
  },
  {
    method: 'get',
    path: '/projects/:projectId/chat',
    handler: 'history',
    middlewares: ['authUser'],
  },
  {
    method: 'delete',
    path: '/projects/:projectId/chat',
    handler: 'clear',
    middlewares: ['authUser'],
  },
] as const
