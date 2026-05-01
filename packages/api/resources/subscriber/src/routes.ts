/**
 * Subscriber route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express router.
 *
 * @module
 */

/**
 * Routes for the subscriber resource. Public endpoints (`subscribe`, `confirm`,
 * `unsubscribe`) intentionally have no `authenticate` middleware so anonymous
 * visitors of a status page or newsletter form can use them. Listing and admin
 * deletion are gated behind `authenticate`.
 */
export const routes = [
  { method: 'post', path: '/subscribers', handler: 'subscribe' },
  { method: 'get', path: '/subscribers/confirm/:token', handler: 'confirm' },
  { method: 'post', path: '/subscribers/unsubscribe/:token', handler: 'unsubscribe' },
  { method: 'get', path: '/subscribers', handler: 'list', middlewares: ['authenticate'] },
  { method: 'get', path: '/subscribers/:id', handler: 'read', middlewares: ['authenticate'] },
  { method: 'delete', path: '/subscribers/:id', handler: 'del', middlewares: ['authenticate'] },
] as const
