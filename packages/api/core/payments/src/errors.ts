/**
 * Error-handling utilities shared by molecule.dev payment provider bonds.
 *
 * @module
 */

/**
 * A "tagged error" — the convention `@molecule/api-secrets`'s
 * `configNotConfiguredError()` and `@molecule/api-resource`'s `respondError()`
 * use to carry an HTTP status + a machine-readable key on an `Error` so a
 * caught error can be re-surfaced with its REAL status instead of being
 * flattened to a generic failure.
 */
export interface TaggedError extends Error {
  /** HTTP status the error should be reported with (e.g. `503`). */
  statusCode: number
  /** Machine-readable key the frontend/operator maps to a specific cause. */
  errorKey: string
}

/**
 * Checks whether a caught value is the tagged "secret not configured" error
 * thrown by `@molecule/api-secrets`'s `configNotConfiguredError()` — e.g. a
 * payment bond's `getClient()`-style helper throwing because `STRIPE_SECRET_KEY`
 * (or `APPLE_SHARED_SECRET`, `GOOGLE_API_SERVICE_KEY_OBJECT`, …) is unset.
 *
 * @remarks
 * Payment provider bond adapters (`verifySubscription`, `verifyReceipt`,
 * `verifyPurchase`, `updateSubscription`, `cancelSubscription`) catch broadly
 * so a genuine verification failure (bad receipt, expired card) degrades to
 * `null` / `{ updated: false }` / `false` instead of throwing through the resource
 * layer. Without this check that catch ALSO swallows a missing-secret error into
 * the exact same shape — "the operator forgot to set `STRIPE_SECRET_KEY`" becomes
 * indistinguishable from "this specific subscription isn't valid", and the
 * actionable message `configNotConfiguredError` built (which key, where to get
 * it) never leaves the server log. Bond adapters MUST check this in every such
 * catch block and RETHROW when it's `true` (never swallow it), so the resource
 * handler's own catch can pass the real `statusCode`/`errorKey` through instead
 * of a generic 400/500.
 *
 * @param error - The caught value (any type — callers narrow with this predicate).
 * @returns `true` if `error` carries `statusCode: 503` and `errorKey: 'config.notConfigured'`.
 */
export const isConfigNotConfiguredError = (error: unknown): error is TaggedError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { errorKey?: unknown }).errorKey === 'config.notConfigured' &&
    typeof (error as { statusCode?: unknown }).statusCode === 'number'
  )
}
