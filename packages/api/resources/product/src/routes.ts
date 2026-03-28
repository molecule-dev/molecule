/**
 * Product route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express router.
 *
 * @module
 */

/** Route array for product CRUD plus variant sub-resource. */
export const routes = [
  { method: 'post', path: '/products', handler: 'create', middlewares: ['authenticate'] },
  { method: 'get', path: '/products', handler: 'list' },
  { method: 'get', path: '/products/:id', handler: 'read' },
  { method: 'patch', path: '/products/:id', handler: 'update', middlewares: ['authenticate'] },
  { method: 'delete', path: '/products/:id', handler: 'del', middlewares: ['authenticate'] },
  { method: 'get', path: '/products/:id/variants', handler: 'listVariants' },
  {
    method: 'post',
    path: '/products/:id/variants',
    handler: 'createVariant',
    middlewares: ['authenticate'],
  },
] as const
