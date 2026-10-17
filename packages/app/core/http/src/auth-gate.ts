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
 * ## A request the gate is waiting for must opt out
 *
 * `awaitAuthGate` holds every request while the gate is pending — including one the gate
 * itself depends on. A gate that waits for a session restore whose own request goes through
 * the SAME client waits on itself: the restore's `GET /users/me` is held by the gate, the
 * restore's promise cannot settle, and nothing but the timeout releases anything (X1
 * xr-molecule-flash-m97 lost ~4 min to exactly this — an app registering
 * `setAuthGate(() => whenSettled())` over a restore that fetched through its own client, with
 * every request stalling the full bound and only a console warning to show for it). So a
 * request the gate's restore makes must pass `skipAuthGate: true`
 * (`RequestConfig.skipAuthGate`).
 *
 * Which held request is the gate's own is NOT detectable here: the gate is arbitrary code
 * returning a promise, so a request cannot be attributed to the async chain that awaits it —
 * and browsers have no async-context API (`AsyncContext` is not shipped) to ask. Releasing
 * requests merely because the gate is pending and they carry no token would drop exactly the
 * first-paint requests the gate exists to hold. The opt-out is therefore the fix, and a
 * timeout with requests held is reported as an error naming it.
 *
 * @module
 */

import { getLogger } from '@molecule/app-logger'

import type { AuthGateRequest } from './types.js'

const logger = getLogger('http')

/** The registered gate, or null when no auth bond wired one (anonymous apps). */
let gate: (() => Promise<void>) | null = null

/**
 * The requests the gate is holding right now, keyed by the waiting request: `GET /users/me`.
 * Read only by the stalled-gate report, so it can name what was held back.
 */
const heldRequests = new Map<symbol, string>()

/**
 * The gate whose wait timed out with requests held, reported once.
 *
 * A deadlocked gate times out for EVERY request it holds, and the caller's own page shows it
 * as one fault: one report per stuck gate names the fix, N reports (one per request, on every
 * page load) are noise — and console errors are read by users and by strict console-error
 * gates. Cleared when the same gate later releases a request normally.
 */
let reportedStall: (() => Promise<void>) | null = null

/**
 * How long a request may be held by the gate before it is sent anyway.
 *
 * The gate waits for the session restore, and a restore that never settles — a stalled
 * connection, an endpoint that hangs without answering — must not hold back every request for
 * the life of the page: an unauthenticated request that arrives is a better failure than an app
 * that never loads. A settled restore is what the deployed race needs (one round trip,
 * hundreds of milliseconds), so this bound is far above any wait it is meant to cause.
 *
 * It is also the cost of a gate that was wired wrong (its restore sends its request through
 * the client the gate holds back — see the module doc): every request it holds stalls this
 * long before it goes out. Measured, so the bound is a number and not a guess:
 * `createJWTAuthClient.initialize()` against a server answering `/users/me` after a delay
 * costs exactly one round trip (0 ms → 7-50 ms; 140 ms → 152-194 ms; 400 ms → 402-413 ms),
 * and a real deployed round trip measures ~140 ms from this VM to a Fly `iad` machine
 * (`docs/experiments/x0/live/task-deployed-latency.report.md`) with 300-410 ms to a deployed
 * app's proxied path over the open internet. 3 s is therefore ~8-20x a normal restore and
 * still clears a slow mobile link — while a missed opt-out costs at most 3 s per request
 * instead of 10.
 */
const GATE_TIMEOUT_MS = 3_000

/**
 * Registers the gate every HTTP request awaits before it is sent, or clears it
 * with `null`.
 *
 * Pass a function that resolves once the session restore has settled — with the
 * template auth that is `() => authClient.whenRestored()`, which resolves
 * immediately when no restore is in flight, so registering it never makes a
 * request wait longer than the restore it was about to race anyway.
 *
 * A gate whose restore sends its OWN request through the gated client deadlocks — the
 * gate holds the request it is waiting for. That request must pass `skipAuthGate: true`
 * (see `RequestConfig.skipAuthGate`); `@molecule/app-auth`'s own restore does not
 * need it because it uses `fetch` rather than the bonded client.
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
  reportedStall = null
}

/**
 * Names a held request for the stalled-gate report. A provider that passes no request
 * description still gets a report — it just cannot say which request was held.
 */
const describeRequest = (request?: AuthGateRequest): string =>
  request?.method || request?.url
    ? `${request?.method ?? 'GET'} ${request?.url ?? ''}`.trim()
    : 'a request'

/**
 * Reports a gate that timed out while holding requests: once per stuck gate, at error level
 * so it reaches the page's error console and any error transport — a console warning on a
 * deployed URL reads as "the site is slow", which is what the gate itself was added for.
 */
const reportStalledGate = (stuck: () => Promise<void>): void => {
  if (reportedStall === stuck) return
  reportedStall = stuck
  const held = [...heldRequests.values()].join(', ')
  logger.error(
    `The auth gate has not settled after ${GATE_TIMEOUT_MS}ms and ${heldRequests.size} request(s) ` +
      `were held by it (${held}); sending them without waiting. If the gate waits for a session ` +
      `restore that makes its own request through this HTTP client, that request is being held by ` +
      `the gate waiting for it: send it with \`skipAuthGate: true\`, or clear the gate with ` +
      `\`setAuthGate(null)\` if nothing restores a session.`,
  )
}

/**
 * Awaits the registered gate, if any. Every HTTP provider calls this before it
 * sends a request; callers never need to.
 *
 * A gate that rejects (a restore that failed) is logged and cleared of consequence: the request
 * is sent rather than held forever, because a dead restore must not block every request for the
 * life of the page. The same holds for a gate that never settles — the wait is bounded by
 * `GATE_TIMEOUT_MS`, and a timeout with requests held is reported at error level naming the fix
 * (`skipAuthGate`).
 *
 * @param request - The request being gated, so a request the gate itself depends on can opt
 *   out (`skipAuthGate`) and a stalled gate can name what it held. A provider passes its own
 *   request config; a caller passing nothing gets the plain wait.
 * @returns A promise that settles when the gate has released the request.
 */
export const awaitAuthGate = async (request?: AuthGateRequest): Promise<void> => {
  // The request IS the gate's restore (or otherwise must not wait): holding it would make
  // the gate wait on itself — see the module doc.
  if (request?.skipAuthGate) return

  const current = gate
  if (!current) return

  const token = Symbol('held-request')
  heldRequests.set(token, describeRequest(request))

  let timer: ReturnType<typeof setTimeout> | undefined
  let timedOut = false
  try {
    await Promise.race([
      // `(async () => current())()` also turns a gate that throws SYNCHRONOUSLY into a rejection:
      // a gate is someone else's code, and no shape of it may reject the request it was holding.
      (async () => current())().catch((error) => {
        logger.warn('The auth gate rejected; sending the request without waiting for it', {
          error,
        })
      }),
      new Promise<void>((resolve) => {
        timer = setTimeout(() => {
          timedOut = true
          // Reported while this request is still in `heldRequests`, so the message names it.
          reportStalledGate(current)
          resolve()
        }, GATE_TIMEOUT_MS)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
    heldRequests.delete(token)
  }

  // The gate released a real request, so any stall reported for it is over: a later one is
  // news again (a fresh restore on a gate that was merely slow the first time).
  if (!timedOut && reportedStall === current) reportedStall = null
}
