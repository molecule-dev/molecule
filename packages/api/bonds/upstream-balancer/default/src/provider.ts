/**
 * Default upstream-balancer provider: health-aware round-robin over one host's set.
 *
 * Extracted from molecule.dev's production edge so every deployment (the platform's
 * own edge, a user's app behind it, a future edge bond) balances the same way:
 *
 * - **Round-robin per host.** The cursor advances for the public host, so two apps
 *   sharing an edge never interleave each other's order.
 * - **A failure is a cooldown, not a verdict.** A member whose last attempt failed is
 *   skipped for `failureCooldownMs`, then becomes eligible again even if nothing
 *   succeeded against it — an instance that recovered on its own is not skipped
 *   forever.
 * - **A retry lands elsewhere.** A retried idempotent request is re-issued to a
 *   DIFFERENT member (preferring one that is not suspect); with one member there is
 *   nothing to choose.
 * - **Draining members receive no new request**, whether the flag is on the member or
 *   set through `markDraining(key)`.
 * - **Never blank the set.** When every member is suspect or draining, the cursor's
 *   own answer is returned: one more try beats turning every address's suspicion into
 *   an outage for the app.
 *
 * @module
 */

import type {
  UpstreamBalancerPolicy,
  UpstreamBalancerProvider,
  UpstreamMember,
} from '@molecule/api-upstream-balancer'

/** How long a member stays skipped after a failed attempt. */
export const DEFAULT_UPSTREAM_FAILURE_COOLDOWN_MS = 10_000

/** The state one balancer instance owns. */
interface BalancerState {
  /** Per-host round-robin cursor. */
  cursor: Map<string, number>
  /** Upstream key → epoch ms of its last failed attempt. */
  failures: Map<string, number>
  /** Upstream keys marked draining by a deploy. */
  draining: Set<string>
}

/**
 * `host:port` — the identity a failure mark, a draining mark and the cursor use.
 *
 * @param upstream - Any upstream member.
 * @returns The key.
 */
export const upstreamKey = (upstream: Pick<UpstreamMember, 'host' | 'port'>): string =>
  `${upstream.host}:${upstream.port}`

/**
 * Create an upstream balancer with its own cursors and marks.
 *
 * @param options - The cooldown and an injectable clock (tests).
 * @returns The balancer.
 */
export const createProvider = (
  options: UpstreamBalancerPolicy & { now?: () => number } = {},
): UpstreamBalancerProvider => {
  const cooldownMs = Math.max(
    0,
    Math.floor(options.failureCooldownMs ?? DEFAULT_UPSTREAM_FAILURE_COOLDOWN_MS),
  )
  const now = options.now ?? ((): number => Date.now())
  const state: BalancerState = {
    cursor: new Map(),
    failures: new Map(),
    draining: new Set(),
  }

  const isSuspect = (upstream: UpstreamMember): boolean => {
    const at = state.failures.get(upstreamKey(upstream))
    return at !== undefined && now() - at < cooldownMs
  }

  const isDraining = (upstream: UpstreamMember): boolean =>
    upstream.draining === true || state.draining.has(upstreamKey(upstream))

  /** A member that must not receive a new request. */
  const skip = (upstream: UpstreamMember): boolean => isSuspect(upstream) || isDraining(upstream)

  const pick = <U extends UpstreamMember>(host: string, members: readonly U[]): U => {
    if (members.length === 0) throw new Error('pickUpstream: the upstream set is empty')
    if (members.length === 1) return members[0]
    const start = state.cursor.get(host) ?? 0
    for (let i = 0; i < members.length; i++) {
      const candidate = members[(start + i) % members.length]
      if (!skip(candidate)) {
        state.cursor.set(host, (start + i + 1) % members.length)
        return candidate
      }
    }
    const chosen = members[start % members.length]
    state.cursor.set(host, (start + 1) % members.length)
    return chosen
  }

  const pickRetry = <U extends UpstreamMember>(
    host: string,
    avoid: U,
    members: readonly U[],
  ): U => {
    if (members.length === 0) throw new Error('pickRetryUpstream: the upstream set is empty')
    if (members.length === 1) return members[0]
    const avoidKey = upstreamKey(avoid)
    const start = state.cursor.get(host) ?? 0
    const rotated = members
      .slice(start)
      .concat(members.slice(0, start))
      .filter((member) => upstreamKey(member) !== avoidKey)
    if (rotated.length === 0) return members[0]
    const fresh = rotated.find((member) => !skip(member))
    const chosen = fresh ?? rotated[0]
    state.cursor.set(host, (members.indexOf(chosen) + 1) % members.length)
    return chosen
  }

  return {
    name: 'default',
    pick,
    pickRetry,
    noteFailure: (upstream): void => {
      state.failures.set(upstreamKey(upstream), now())
    },
    noteSuccess: (upstream): void => {
      state.failures.delete(upstreamKey(upstream))
    },
    isSuspect,
    markDraining: (key): void => {
      state.draining.add(key)
    },
    clearDraining: (key): void => {
      state.draining.delete(key)
    },
    isDraining,
    reset: (): void => {
      state.cursor.clear()
      state.failures.clear()
      state.draining.clear()
    },
  }
}

/** The shared provider instance. */
export const provider: UpstreamBalancerProvider = createProvider()
