/**
 * Booking route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express router.
 *
 * @module
 */

/**
 * Booking routes. Supports availability checking, CRUD, lifecycle transitions,
 * and resource-scoped listing.
 */
export const routes = [
  {
    method: 'get',
    path: '/bookings/availability/:resourceType/:resourceId',
    handler: 'checkAvailability',
    middlewares: ['authenticate'],
  },
  { method: 'post', path: '/bookings', handler: 'book', middlewares: ['authenticate'] },
  { method: 'get', path: '/bookings', handler: 'getBookings', middlewares: ['authenticate'] },
  { method: 'get', path: '/bookings/:id', handler: 'getById', middlewares: ['authenticate'] },
  {
    method: 'post',
    path: '/bookings/:id/cancel',
    handler: 'cancel',
    middlewares: ['authenticate'],
  },
  {
    method: 'put',
    path: '/bookings/:id/reschedule',
    handler: 'reschedule',
    middlewares: ['authenticate'],
  },
  {
    method: 'post',
    path: '/bookings/:id/confirm',
    handler: 'confirm',
    middlewares: ['authenticate'],
  },
  {
    method: 'post',
    path: '/bookings/:id/complete',
    handler: 'complete',
    middlewares: ['authenticate'],
  },
] as const
