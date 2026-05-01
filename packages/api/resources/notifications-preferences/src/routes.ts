/**
 * Notification preferences route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express
 * router. Routes are scoped to the authenticated user via `/me/...`.
 *
 * @module
 */

/**
 * Routes for reading and updating the current user's notification
 * preferences.
 */
export const routes = [
  {
    method: 'get',
    path: '/me/notification-preferences',
    handler: 'getPreferences',
    middlewares: ['authenticate'],
  },
  {
    method: 'put',
    path: '/me/notification-preferences',
    handler: 'updatePreferences',
    middlewares: ['authenticate'],
  },
] as const
