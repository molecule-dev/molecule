/**
 * Standard failure telemetry for bond packages — the emit half of the
 * catch → telemetry → autofix loop.
 *
 * A bond that wraps an external vendor (email, payments, storage, an AI
 * provider) fails in ways its CALLERS may absorb and retry, which is exactly
 * how a vendor outage or a systematic misconfiguration used to stay invisible:
 * every failure was only a log line on whichever machine happened to be
 * handling the request. Emitting `bond.failure` at the bond's vendor boundary
 * makes every one of those failures queryable in one place, where the
 * error-health detector (molecule-dev `api/src/scripts/error-health.ts`) picks
 * new failure classes and spikes up into alerts and fix cards.
 *
 * Call it in a bond's failure path BEFORE rethrowing — the call NEVER throws
 * and NEVER blocks (no provider bonded is a silent no-op, so a library user
 * without analytics pays nothing), and a per-signature throttle keeps an
 * outage storm at one event per class per 30 s window.
 *
 * @example
 * ```typescript
 * import { trackBondFailure } from '@molecule/api-analytics'
 *
 * } catch (error) {
 *   trackBondFailure({ bond: 'emails-mailgun', operation: 'send', error })
 *   throw error
 * }
 * ```
 *
 * @module
 */

import { hasProvider, track } from './provider.js'

/** One emission per bond.failure class signature per this many milliseconds. */
const THROTTLE_WINDOW_MS = 30_000

/** Past this many signatures the map drops expired entries, then the oldest. */
const THROTTLE_MAP_LIMIT = 5_000

const lastTrackedAt = new Map<string, number>()

/** The longest stored failure message — triage breadcrumb, not a dump. */
const MAX_MESSAGE_LEN = 500

/**
 * Whether this signature may emit now, stamping it when yes.
 *
 * @param signature - The class signature (bond + operation + error name).
 * @param now - Current time in ms.
 * @returns True when the emission should proceed.
 */
function shouldEmit(signature: string, now: number): boolean {
  const at = lastTrackedAt.get(signature)
  if (at !== undefined && now - at < THROTTLE_WINDOW_MS) return false
  if (lastTrackedAt.size >= THROTTLE_MAP_LIMIT) {
    for (const [sig, seen] of lastTrackedAt) {
      if (now - seen >= THROTTLE_WINDOW_MS) lastTrackedAt.delete(sig)
    }
    while (lastTrackedAt.size >= THROTTLE_MAP_LIMIT) {
      const oldest = lastTrackedAt.keys().next().value
      if (oldest === undefined) break
      lastTrackedAt.delete(oldest)
    }
  }
  lastTrackedAt.set(signature, now)
  return true
}

/** The thrown value's constructor name, or 'unknown'. */
function errorNameOf(error: unknown): string {
  if (error instanceof Error) return error.name
  if (typeof error === 'object' && error !== null && 'name' in error) {
    const name = (error as { name?: unknown }).name
    if (typeof name === 'string' && name) return name
  }
  return typeof error === 'string' && error ? 'string' : 'unknown'
}

/** The thrown value's message, or its string form, capped. */
function messageOf(error: unknown): string | undefined {
  if (error === undefined || error === null) return undefined
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : (() => {
            try {
              return JSON.stringify(error)
            } catch (_error) {
              // Intentional noop — a circular thrown value falls back to a
              // generic marker rather than ever breaking the failure path.
              return '[unserializable thrown value]'
            }
          })()
  return raw ? raw.slice(0, MAX_MESSAGE_LEN) : undefined
}

/**
 * Emit `bond.failure` — a vendor-facing bond operation failed. Best-effort by
 * construction: no bonded analytics provider is a silent no-op, and a provider
 * rejection is swallowed (a telemetry outage must never mask — or add noise
 * to — the bond's own error). Throttled per class signature.
 *
 * @param args - The failure details.
 * @param args.bond - The bond's capability id without the `@molecule/api-` scope (e.g. `'emails-mailgun'`, `'payments-stripe'`, `'ai-anthropic'`).
 * @param args.operation - What the bond was doing (`'send'`, `'upload'`, `'charge'`, `'dispatch'`, …).
 * @param args.error - The thrown value, when there was one.
 * @param args.detail - Extra class-stable context (a status code, a provider error code) — never request content, never a secret.
 */
export function trackBondFailure(args: {
  bond: string
  operation: string
  error?: unknown
  detail?: string
}): void {
  try {
    if (!hasProvider()) return
    const { bond, operation, error, detail } = args
    const errorName = errorNameOf(error)
    if (!shouldEmit(`${bond}|${operation}|${errorName}`, Date.now())) return
    const message = messageOf(error)
    void track({
      name: 'bond.failure',
      properties: {
        bond,
        operation,
        errorName,
        ...(message ? { message } : {}),
        ...(detail ? { detail: detail.slice(0, MAX_MESSAGE_LEN) } : {}),
      },
    }).catch(() => {
      // Intentional noop — analytics is best-effort; the bond's own error
      // path continues whether or not the provider accepts the event.
    })
  } catch (_error) {
    // Intentional noop — telemetry must never break the failure path it rides.
  }
}

/** Test seam: forget every throttle stamp. */
export function resetBondFailureThrottleForTests(): void {
  lastTrackedAt.clear()
}
