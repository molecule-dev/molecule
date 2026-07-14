/**
 * Workspace resource for molecule.dev.
 *
 * Ships the unified `workspaces`, `workspace_members`, `workspace_invites`
 * schema, role-aware authz helpers (`owner` / `admin` / `member`), and
 * an invite-by-email flow with single-use tokens. Replaces ad-hoc
 * per-app workspace tables.
 *
 * @module
 * @example
 * ```typescript
 * import { routes, requestHandlerMap } from '@molecule/api-resource-workspace'
 *
 * // Wire routes into your Express app via mlcl inject:
 * //   POST   /workspaces
 * //   GET    /workspaces
 * //   GET    /workspaces/:id
 * //   PATCH  /workspaces/:id
 * //   DELETE /workspaces/:id
 * //   GET    /workspaces/:id/members
 * //   PATCH  /workspaces/:id/members/:userId
 * //   DELETE /workspaces/:id/members/:userId
 * //   POST   /workspaces/:id/invites
 * //   GET    /workspaces/:id/invites
 * //   DELETE /workspaces/:id/invites/:inviteId
 * //   POST   /workspaces/invites/accept
 * ```
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
