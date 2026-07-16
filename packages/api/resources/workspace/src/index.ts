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
 *
 * @remarks
 * Session-auth prerequisite: every route requires an authenticated session
 * (`authenticate`) — handlers read `res.locals.session.userId` and fail closed
 * with 401; mount behind your global auth middleware.
 *
 * Role gates are enforced in-handler via `assertMember(workspaceId, userId,
 * minRole)` with the `owner` > `admin` > `member` hierarchy: `list` returns
 * only workspaces the CALLER belongs to, reads require membership, member-role
 * changes/removals and all invite management require at least `admin`, and an
 * inviter cannot grant a role higher than their own. Non-members are denied
 * (403). Never accept a client-supplied user id for any of these checks.
 *
 * Invite delivery is YOUR app's concern: `POST /workspaces/:id/invites` stores
 * a single-use, expiring token and returns it to the (admin) caller — this
 * package sends no email. Build the accept link from the token; `POST
 * /workspaces/invites/accept` with `{ token }` joins the CURRENT session user
 * at the invite's role.
 *
 * Tables: `src/__setup__/workspaces.sql` creates `workspaces`,
 * `workspace_members`, and `workspace_invites`. An mlcl-scaffolded API replays
 * `__setup__/*.sql` automatically on migrate; anywhere else run it once —
 * nothing at runtime creates them.
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
