/**
 * One npm 2FA code shared by npm calls that run side by side, without spending
 * npm's patience on codes that cannot work.
 *
 * npm counts every call that carries a rejected code. A handful of them close in
 * a minute (2026-11-15: five calls in flight when a phone code expired) and npm
 * answers `429 … rate limited otp` to every 2FA'd call for minutes after,
 * including the first one with a fresh code; each call made during that lock
 * extends it. The trust sweep kept starting packages, and asking the phone for
 * codes, into the lock, and lost 200 packages to it. So, for every call:
 *
 * - a rejected code is never handed to a call that has not started yet; calls
 *   wait for the next code, and calls refused by the same code share one request
 *   for it;
 * - every new code goes out on ONE call first, and the others start only once it
 *   answered, so a code that does not work costs one rejection, not one per call;
 * - a rate-limit answer pauses every call and asks for nothing until the pause
 *   ends (it doubles each time npm is still locked, and resets on a success), then
 *   a fresh code is tried on one call; after `maxRateLimits` locks in a row the
 *   gate gives up with {@link TwoFactorRateLimited}.
 */
import console from 'node:console'
import { setTimeout as delay } from 'node:timers/promises'

/** npm kept rate-limiting 2FA through every pause; the caller stops and keeps what it finished. */
export class TwoFactorRateLimited extends Error {}

/**
 * What an npm failure says about the 2FA code, from its status and output.
 *
 * Rate limiting is checked first: npm's text for it ("rate limited otp") names the
 * code too, and taking it for a rejected code is what made the sweep ask for new
 * codes into the lock.
 *
 * @param failure - The HTTP status (when known) and npm's output.
 * @param failure.status - The HTTP status of the call, when there is one.
 * @param failure.text - What npm printed or answered.
 * @returns `rate-limited`, `otp` (the code was rejected or missing), or null for anything else.
 */
export function npmTwoFactorFailure({ status, text = '' }) {
  if (status === 429 || /\bE429\b|429 Too Many Requests|rate[ -]?limited/i.test(text))
    return 'rate-limited'
  if (status === 401 || /EOTP|one-time password|\botp\b|two-factor/i.test(text)) return 'otp'
  return null
}

/**
 * Creates the gate.
 *
 * @param options - How codes are obtained and how long to pause.
 * @param options.fetchCode - Returns a code: `(label, why)` where `why` is `first`,
 *   `rejected` (npm refused the last one) or `rate-limited` (after a pause).
 * @param options.pauseMs - The first pause after a rate limit; each pause after it
 *   doubles, up to ten times this.
 * @param options.maxRateLimits - Rate-limit answers in a row before giving up.
 * @param options.sleep - Waits `ms` milliseconds (injectable for tests).
 * @param options.log - Where progress lines go.
 * @returns `prime(label)` fetches the first code ahead of the calls; `run(label, call,
 *   failureOf)` runs `call(code)` until `failureOf(result)` is neither `otp` nor
 *   `rate-limited`, and returns that result.
 */
export function createOtpGate({
  fetchCode,
  pauseMs = 180_000,
  maxRateLimits = 5,
  sleep = (ms) => delay(ms),
  log = (line) => console.error(line),
}) {
  /** The code calls get; null once npm refused it. */
  let code = null
  /** Why the next code is needed (passed to fetchCode). */
  let why = 'first'
  /** The request for a code in flight, shared by every caller waiting for one. */
  let refresh = null
  /** True when the next call must go alone. */
  let probeNext = true
  /** Settles when the call trying a new code has answered. */
  let probe = null
  /** Settles when the rate-limit pause ends. */
  let pause = null
  /** Rate-limit answers since the last success. */
  let limits = 0
  /** Set once the gate gave up; every waiting and later call gets it. */
  let gaveUp = null

  const fetchNext = (label) => {
    refresh ??= (async () => {
      try {
        code = await fetchCode(label, why)
      } catch (error) {
        // No code (the owner denied, no terminal): final for every call, so a call
        // still running cannot ask again after the answer was no.
        gaveUp = error
        throw error
      }
      probeNext = true
    })().finally(() => {
      refresh = null
    })
    return refresh
  }

  /** Waits until a call may start; returns its code and whether it is the probe. */
  const ready = async (label) => {
    for (;;) {
      if (gaveUp) throw gaveUp
      if (pause) await pause
      else if (probe) await probe
      else if (refresh) await refresh
      else if (!code) await fetchNext(label)
      else if (probeNext) {
        probeNext = false
        let settle
        probe = new Promise((resolve) => (settle = resolve))
        return {
          code,
          done: () => {
            probe = null
            settle()
          },
        }
      } else return { code, done: () => {} }
    }
  }

  const rejected = (spent) => {
    if (code !== spent) return
    code = null
    why = 'rejected'
  }

  const rateLimited = (spent) => {
    if (code === spent) code = null
    why = 'rate-limited'
    if (pause) return
    limits++
    if (limits > maxRateLimits) {
      gaveUp = new TwoFactorRateLimited(
        `npm kept rate-limiting 2FA through ${maxRateLimits} pauses; try again later`,
      )
      throw gaveUp
    }
    const ms = Math.min(pauseMs * 2 ** (limits - 1), pauseMs * 10)
    log(
      `  npm is rate-limiting 2FA codes; pausing every call for ${Math.round(ms / 1000)}s before asking for a new code`,
    )
    pause = sleep(ms).finally(() => {
      pause = null
    })
  }

  return {
    prime: async (label) => {
      if (!code) await fetchNext(label)
    },
    run: async (label, call, failureOf) => {
      for (;;) {
        const slot = await ready(label)
        let result
        let failure
        try {
          result = await call(slot.code)
          failure = failureOf(result)
          // Recorded before the waiting calls are released, so none of them starts
          // with the code npm just refused.
          if (failure === 'otp') rejected(slot.code)
          else if (failure === 'rate-limited') rateLimited(slot.code)
          else limits = 0
        } finally {
          slot.done()
        }
        if (failure !== 'otp' && failure !== 'rate-limited') return result
      }
    },
  }
}
