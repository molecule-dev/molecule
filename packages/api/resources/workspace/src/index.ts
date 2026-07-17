/**
 * Workspace resource for molecule.dev.
 *
 * Ships the unified `workspaces`, `workspace_members`, `workspace_invites`
 * schema, role-aware authz helpers (`owner` / `admin` / `member`), and
 * an invite-by-email flow with single-use tokens. Replaces ad-hoc
 * per-app workspace tables.
 *
 * @e2e
 * Membership/isolation checklist — drive the real UI (live preview, no mocks)
 * with at least TWO distinct signed-in users, adapt each item to this app's
 * actual workspace screens/flows, and check every box off one by one. A box
 * you can't check is a tenancy bug to fix — not a skip:
 * - [ ] Creating a workspace makes the creator its `owner`: it appears in their
 *   own workspace list (GET /workspaces) and GET /workspaces/:id returns it,
 *   backed by a `workspace_members` row at role `owner`.
 * - [ ] Inviting a user (POST /workspaces/:id/invites, admin-only) issues a
 *   single-use token; the invited user accepting it (POST
 *   /workspaces/invites/accept) becomes a member at the invited role and can
 *   now read the workspace and its scoped data — data they could NOT see before.
 * - [ ] Role enforcement: a plain `member` is 403 on every privileged endpoint —
 *   invite, revoke an invite, change a member's role, edit settings (PATCH
 *   /workspaces/:id), delete (DELETE /workspaces/:id) — while an `admin`/`owner`
 *   can perform them. A caller can never grant a role higher than their own.
 * - [ ] Removing a member (an admin removes them, or they leave via DELETE
 *   /workspaces/:id/members/:selfId) revokes access immediately: their next read
 *   of the workspace or its scoped data is 403, and it drops from their list.
 * - [ ] Isolation: a user who is NOT a member of workspace W cannot read or
 *   mutate W or its scoped data by guessing W's id — every such call is 403 (or
 *   404), never leaking W's contents. Verify with a real second account.
 * - [ ] No self-join: accepting a bogus/expired token, or any attempt to add
 *   yourself without a valid invite, is rejected — the only way in is a token
 *   an admin issued for you.
 * - [ ] A workspace is never orphaned: removing or demoting the LAST `owner` is
 *   refused (409), and ownership transfer works — an owner promotes another
 *   member to `owner`, after which the original owner can safely leave.
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
 * - **List endpoints return a PAGINATED envelope** `{ data, total, limit, offset }`, not a
 *   bare array — read the rows off `result.data` (server). On the client, `unwrapList(res)`
 *   from `@molecule/app-http` normalizes this envelope (pass it the whole HttpResponse), so
 *   the rows come back; reading the response as a bare array — or `res.data` alone (which is
 *   the envelope) — yields an EMPTY list.
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
