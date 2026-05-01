/**
 * Streak authorizers.
 *
 * All streak operations require authentication and are scoped to the
 * current user via `res.locals.session.userId`. No additional
 * authorizers are needed — handlers reject unauthenticated requests
 * with `401`.
 *
 * @module
 */
export {}
