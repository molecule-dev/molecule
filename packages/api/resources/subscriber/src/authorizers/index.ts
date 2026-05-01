/**
 * Subscriber authorizers.
 *
 * The public `subscribe`, `confirm`, and `unsubscribe` endpoints are intentionally
 * unauthenticated — anonymous visitors of a status page or newsletter form must
 * be able to use them. Per-route admin gating (list/read/delete) is wired via
 * the `authenticate` middleware declared in {@link routes}.
 *
 * @module
 */

export {}
