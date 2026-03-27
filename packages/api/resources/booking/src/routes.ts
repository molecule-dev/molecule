/**
 * Booking route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express router.
 *
 * @module
 */

/**
 *
 */
export const routes = [
  { method: 'post', path: '/bookings', handler: 'create' },
  { method: 'get', path: '/bookings', handler: 'list' },
  { method: 'get', path: '/bookings/:id', handler: 'read' },
  { method: 'patch', path: '/bookings/:id', handler: 'update' },
  { method: 'delete', path: '/bookings/:id', handler: 'del' },
] as const
