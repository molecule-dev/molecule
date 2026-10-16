/**
 * The one gate every HTTP request awaits before it is sent.
 *
 * A page that fetches viewer-dependent data on mount (`GET /profiles/:user`,
 * a feed, a "favorited" flag) can fire BEFORE the stored session has been
 * restored, so the request leaves with no `Authorization` header and the server
 * answers for an anonymous viewer — `following: false` on a user you follow.
 * It is invisible on localhost, where the restore wins the race against the
 * first effect, and appears over the network as soon as the restore takes one
 * round trip: X1 xr-molecule-flash-m95 spent ~25 min chasing this as "database
 * leftovers" on the deployed URL.
 *
 * So the auth bond registers a gate here (`setAuthGate`) and every request
 * waits for it (`awaitAuthGate`) — the race is impossible to write by hand.
 * `@molecule/app-bonds-default-react`'s auth helpers register the gate for
 * apps that bond auth, so an app does not have to get it right itself.
 *
 * The gate is module-level, not per client, on purpose: the client an app ends
 * up using is often created AFTER the auth bond ran (`setupAuthDefault()` then
 * `setupHttpDefault()`), and a gate installed on the throwaway client the auth
 * bond saw would be silently lost.
 *
 * @module
 */

import { getLogger } from '@molecule/app-logger'

const logger = getLogger('http')

/** The registered gate, or null when no auth bond wired one (anonymous apps). */
let gate: (() => Promise<void>) | null = null

/**
 * Registers the gate every HTTP request awaits before it is sent, or clears it
 * with `null`.
 *
 * Pass a function that resolves once the session restore has settled — with the
 * template auth that is `() => authClient.whenRestored()`, which resolves
 * immediately when no restore is in flight, so registering it never makes a
 * request wait longer than the restore it was about to race anyway.
 *
 * @param next - The gate, or `null` to clear a previously registered one.
 *
 * @example
 * ```typescript
 * import { setAuthGate } from '@molecule/app-http'
 *
 * setAuthGate(() => authClient.whenRestored())
 * ```
 */
export const setAuthGate = (next: (() => Promise<void>) | null): void => {
  gate = next
}

/**
 * Awaits the registered gate, if any. Every HTTP provider calls this before it
 * sends a request; callers never need to.
 *
 * A gate that rejects (a restore that failed) is logged and then cleared of
 * consequence: the request is sent rather than held forever, because a dead
 * restore must not block every request for the life of the page.
 *
 * @returns A promise that settles when the gate has released the request.
 */
export const awaitAuthGate = async (): Promise<void> => {
  const current = gate
  if (!current) return
  try {
    await current()
  } catch (error) {
    logger.warn('The auth gate rejected; sending the request without waiting for it', { error })
  }
}
