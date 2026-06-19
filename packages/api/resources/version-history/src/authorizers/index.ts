/**
 * Version-history authorizers.
 *
 * The version-history store is polymorphic — it captures snapshots of any
 * resource type and owns no permission model of its own — so access control is
 * **pluggable and fail-closed**, not open. Every route requires an
 * authenticated session (see `routes.ts`) AND its handler calls
 * {@link isVersionAuthorized}, which re-derives the caller from
 * `res.locals.session.userId` and dispatches to the app-registered
 * {@link VersionOwnershipResolver} for the parent `resourceType`
 * (`registerOwnershipResolver`). With no resolver registered the caller is
 * denied (404, no existence leak), so mounting the raw routes never exposes
 * another tenant's snapshots.
 *
 * Cross-tenant inspection/restore (an admin/compliance console) is **opt-in**:
 * compose {@link versionHistoryAdmin} onto a route to widen an authenticated
 * *admin* to all users' versions. Apps with a finer-grained access model may
 * instead supply their own widening middleware that sets
 * `res.locals.versionHistoryAdmin` after its own check.
 *
 * @module
 */

export * from './ownership.js'
