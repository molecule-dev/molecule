/**
 * Inventory route definitions.
 *
 * Declarative routing — mlcl inject reads these to generate the Express router.
 *
 * @module
 */

/**
 *
 */
export const routes = [
  { method: 'post', path: '/inventorys', handler: 'create' },
  { method: 'get', path: '/inventorys', handler: 'list' },
  { method: 'get', path: '/inventorys/:id', handler: 'read' },
  { method: 'patch', path: '/inventorys/:id', handler: 'update' },
  { method: 'delete', path: '/inventorys/:id', handler: 'del' },
] as const
