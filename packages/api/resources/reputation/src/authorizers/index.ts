/**
 * Reputation authorizers.
 *
 * Reputation reads are public — no authorizers are required. Mutating
 * helpers ({@link awardBadge}, {@link recordEvent}, etc.) are exposed
 * as service-layer functions only and are expected to be called from
 * server-internal code paths (cron jobs, domain hooks, admin actions)
 * that perform their own authorization.
 *
 * @module
 */
export {}
