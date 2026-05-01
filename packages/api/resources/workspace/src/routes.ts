/**
 * Workspace route definitions.
 *
 * Declarative routing — `mlcl inject` reads these to generate the Express
 * router. Routes cover workspace CRUD, member management, and invites.
 *
 * @module
 */

/**
 * Routes for workspaces, members, and invites.
 */
export const routes = [
  { method: 'post', path: '/workspaces', handler: 'create', middlewares: ['authenticate'] },
  { method: 'get', path: '/workspaces', handler: 'list', middlewares: ['authenticate'] },
  {
    method: 'post',
    path: '/workspaces/invites/accept',
    handler: 'accept',
    middlewares: ['authenticate'],
  },
  { method: 'get', path: '/workspaces/:id', handler: 'read', middlewares: ['authenticate'] },
  { method: 'patch', path: '/workspaces/:id', handler: 'update', middlewares: ['authenticate'] },
  { method: 'delete', path: '/workspaces/:id', handler: 'del', middlewares: ['authenticate'] },
  {
    method: 'get',
    path: '/workspaces/:id/members',
    handler: 'listAll',
    middlewares: ['authenticate'],
  },
  {
    method: 'patch',
    path: '/workspaces/:id/members/:userId',
    handler: 'updateRole',
    middlewares: ['authenticate'],
  },
  {
    method: 'delete',
    path: '/workspaces/:id/members/:userId',
    handler: 'remove',
    middlewares: ['authenticate'],
  },
  {
    method: 'post',
    path: '/workspaces/:id/invites',
    handler: 'invite',
    middlewares: ['authenticate'],
  },
  {
    method: 'get',
    path: '/workspaces/:id/invites',
    handler: 'listInvites',
    middlewares: ['authenticate'],
  },
  {
    method: 'delete',
    path: '/workspaces/:id/invites/:inviteId',
    handler: 'revoke',
    middlewares: ['authenticate'],
  },
] as const
