/**
 * Trash authorizers.
 *
 * Trash rows capture snapshots of deleted records, so the base routes are
 * **secure by default**: every route requires `authenticate` (see `routes.ts`)
 * and every handler is owner-scoped — it re-derives the owner from
 * `res.locals.session.userId`, ignores any client-supplied `userId`, and
 * returns/acts on only the caller's own rows. There is no open, anonymous, or
 * client-trusted endpoint.
 *
 * Cross-user inspection (a support/compliance trash console) is **opt-in**:
 * compose {@link trashAdmin} onto a route to widen an authenticated *admin* to
 * all users' rows. Apps with a finer-grained access model may instead supply
 * their own widening middleware that sets `res.locals.trashAdmin` after its own
 * check.
 *
 * @module
 */

export * from './trashAdmin.js'
