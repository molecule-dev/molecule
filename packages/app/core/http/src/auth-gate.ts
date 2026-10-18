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
 * Waiting for the restore does NOT attach its token: a separately created HTTP
 * client needs `createDefaultHttpClientWithAuthBearer({ baseURL,
 * getToken: () => authClient.getAccessToken(), authScheme })` from
 * `@molecule/app-bonds-default-react` (or the auth client built with
 * `createDefaultAuthClientWithHttpSync`, which mirrors the token into the
 * bonded client) plus `setAuthGate(() => authClient.whenRestored())`.
 *
 * The gate is module-level, not per client, on purpose: the client an app ends
 * up using is often created AFTER the auth bond ran (`setupAuthDefault()` then
 * `setupHttpDefault()`), and a gate installed on the throwaway client the auth
 * bond saw would be silently lost.
 *
 * ## The gate's own restore requests are never held
 *
 * `awaitAuthGate` holds every request while the gate is pending — except the ones the gate's
 * settle function issues itself. Those are part of the restore it is waiting for; holding them
 * makes the gate wait on itself, and nothing but the timeout releases anything (X1
 * xr-molecule-flash-m97 and xr-molecule-flash-m173 both lost minutes to this: an app
 * registering `setAuthGate(() => restoreSession())` over a restore that fetched through the
 * same client, every page held for the full bound, and 917 `GET /api/user` requests named by
 * one console line). So `setAuthGate(() => restoreSession())` works as written when
 * `restoreSession` calls the gated client.
 *
 * "Issued by the gate" means issued while the settle function is running: the client's
 * `request()` reaches `awaitAuthGate` before its first `await`, so a restore's call is made in
 * the settle function's own synchronous execution. A restore that awaits something else first
 * (a storage read, a `Promise.resolve()`) and only then calls the client issues its request
 * from a later continuation, which nothing can attribute to the gate — browsers ship no
 * async-context API (`AsyncContext`/`AsyncLocalStorage`) to ask, and releasing requests merely
 * because the gate is pending would drop exactly the first-paint requests the gate exists to
 * hold (m95). That request must pass `skipAuthGate: true` (`RequestConfig.skipAuthGate`), and
 * a timeout with requests held is reported at error level naming it.
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
 * The settle-function invocation requests are currently waiting on, shared by every request
 * that arrives while the gate is pending.
 *
 * Without it each held request re-invokes the gate, and a gate that issues a request on every
 * call floods the network: the m97 shape measured 855 `fetch` calls for one page (`task-auth-
 * gate-deadlock.report.md`). `null` when no invocation is in flight; `setAuthGate` clears it
 * so a re-registered gate is never shared with the old one's waiters.
 */
let inFlightGate: Promise<void> | null = null

/**
 * True only while the gate's settle function is executing synchronously.
 *
 * A request that reaches `awaitAuthGate` in this window was issued BY the restore — the fetch
 * client's `request()` awaits the gate before anything else, so the call is made in the settle
 * function's own execution. Holding it would make the gate wait on itself (see the module
 * doc); requests issued after the function awaits something else are held as usual.
 */
let gateSettling = false

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
 * Waiting for the restore does NOT attach its token: a separately created HTTP
 * client needs `createDefaultHttpClientWithAuthBearer({ baseURL,
 * getToken: () => authClient.getAccessToken(), authScheme })` from
 * `@molecule/app-bonds-default-react` (or the auth client built with
 * `createDefaultAuthClientWithHttpSync`, which mirrors the token into the
 * bonded client) plus `setAuthGate(() => authClient.whenRestored())`.
 *
 * The restore's own requests are never held: a request the settle function issues while it
 * runs goes out immediately, so `setAuthGate(() => restoreSession())` cannot deadlock even
 * when `restoreSession` calls the gated client. A restore that awaits something else first
 * (a storage read, a `Promise.resolve()`) issues its request from a later continuation, which
 * the gate cannot recognize — that request needs `skipAuthGate: true` (see
 * `RequestConfig.skipAuthGate`). `@molecule/app-auth`'s own restore needs neither because it
 * uses `fetch` rather than the bonded client.
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
  inFlightGate = null
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
 * How many held request names the stalled-gate report prints before summarizing the rest.
 *
 * The report is console output, and every reader of it truncates: molecule-dev's route walk
 * keeps the first 200 characters of a console error, so the sentence naming the fix has to
 * come first — and the request list is capped so the message stays readable when a deadlocked
 * gate has held hundreds of requests (xr-molecule-flash-m173: 917 `GET /api/user`).
 */
const MAX_NAMED_HELD_REQUESTS = 5

/**
 * Reports a gate that timed out while holding requests: once per stuck gate, at error level
 * so it reaches the page's error console and any error transport — a console warning on a
 * deployed URL reads as "the site is slow", which is what the gate itself was added for.
 *
 * Leads with the cause and the fix, then names at most `MAX_NAMED_HELD_REQUESTS` distinct
 * requests and counts the rest: an unbounded join buried the fix clause behind 900 names in
 * xr-molecule-flash-m173, and no reader of the line ever reached it.
 */
const reportStalledGate = (stuck: () => Promise<void>): void => {
  if (reportedStall === stuck) return
  reportedStall = stuck
  const names = [...new Set(heldRequests.values())]
  const shown = names.slice(0, MAX_NAMED_HELD_REQUESTS)
  const more = heldRequests.size - shown.length
  logger.error(
    `The auth gate is waiting on itself: its restore's request is held by it. Send that ` +
      `request with \`skipAuthGate: true\`, or clear the gate with \`setAuthGate(null)\` if ` +
      `nothing restores a session. Held ${heldRequests.size} request(s) for ` +
      `${GATE_TIMEOUT_MS}ms${shown.length ? `: ${shown.join(', ')}` : ''}` +
      `${more > 0 ? ` (and ${more} more)` : ''}.`,
  )
}

/**
 * Starts the gate's settle function — once, shared by every request that arrives while it is
 * pending — turning a rejection (or a synchronous throw) into a logged warning so a failed
 * restore releases its waiters instead of rejecting them.
 *
 * `gateSettling` is true only for the function's synchronous execution: the IIFE runs
 * `current()` up to its first `await` before this call returns, and any request the restore
 * issues there (the gated client's `request()` awaits the gate before anything else) bypasses
 * the gate instead of waiting on the invocation it belongs to.
 */
const invokeGate = (current: () => Promise<void>): Promise<void> => {
  if (inFlightGate) return inFlightGate

  let invocation: Promise<void>
  gateSettling = true
  try {
    invocation = (async () => current())()
  } finally {
    gateSettling = false
  }

  const shared = invocation.catch((error) => {
    logger.warn('The auth gate rejected; sending the request without waiting for it', {
      error,
    })
  })
  inFlightGate = shared
  void shared.then(() => {
    if (inFlightGate === shared) inFlightGate = null
  })
  return shared
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

  // Issued while the gate's settle function is running: part of the restore it is settling,
  // never held by it. See `invokeGate` and the module doc.
  if (gateSettling) return

  const token = Symbol('held-request')
  heldRequests.set(token, describeRequest(request))

  let timer: ReturnType<typeof setTimeout> | undefined
  let timedOut = false
  try {
    await Promise.race([
      // One invocation, shared: `invokeGate` also turns a gate that throws SYNCHRONOUSLY into
      // a rejection — a gate is someone else's code, and no shape of it may reject the
      // request it was holding.
      invokeGate(current),
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
