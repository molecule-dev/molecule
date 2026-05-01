/**
 * Property route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express router.
 *
 * @module
 */

/** Route array for property CRUD plus units, photos, and amenities sub-resources. */
export const routes = [
  { method: 'post', path: '/properties', handler: 'create', middlewares: ['authenticate'] },
  { method: 'get', path: '/properties', handler: 'list' },
  { method: 'get', path: '/properties/:id', handler: 'read' },
  { method: 'patch', path: '/properties/:id', handler: 'update', middlewares: ['authenticate'] },
  { method: 'delete', path: '/properties/:id', handler: 'del', middlewares: ['authenticate'] },
  { method: 'get', path: '/properties/:id/units', handler: 'listUnits' },
  {
    method: 'post',
    path: '/properties/:id/units',
    handler: 'createUnit',
    middlewares: ['authenticate'],
  },
  { method: 'get', path: '/properties/:id/photos', handler: 'listPhotos' },
  {
    method: 'post',
    path: '/properties/:id/photos',
    handler: 'createPhoto',
    middlewares: ['authenticate'],
  },
  { method: 'get', path: '/properties/:id/amenities', handler: 'listAmenities' },
  {
    method: 'post',
    path: '/properties/:id/amenities',
    handler: 'createAmenity',
    middlewares: ['authenticate'],
  },
] as const
