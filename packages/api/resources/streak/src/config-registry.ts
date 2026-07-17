/**
 * Server-side streak-config resolver registry.
 *
 * Streak levers — the reset window (`reset_after_hours`), the freeze cap
 * (`freezes_per_period`), and the event timestamp — decide how much earned
 * progress a recorded activity produces. If the stock HTTP handlers took them
 * from the request body, a client could forge its own streak: stage many
 * "days" in a single second via a chosen `when`, widen the window so gaps
 * never reset, or raise the freeze cap so a missed period never resets. So the
 * HTTP boundary reads NONE of them from the client — the timestamp is the
 * server clock and the config is resolved here, on the server.
 *
 * This registry lets the app decide the config per-`activity_kind` (and
 * per-user, e.g. deriving `freezes_per_period` from the caller's plan) at
 * startup, without baking concrete plan/user imports into this package
 * (mirrors the tag / trash / version-history ownership-resolver registries).
 *
 * **Fail-safe:** when no resolver is registered (or it throws), the handlers
 * use platform defaults — `reset_after_hours` falls to the engine default
 * (24h) and `freezes_per_period` is `0` (freezes OFF). A generated app that
 * mounts the stock routes without wiring config gets safe, non-inflatable
 * behavior — never client-controlled config, and freezes only ever exist when
 * the server explicitly grants them.
 *
 * @module
 */
import { logger } from '@molecule/api-logger'

import type { StreakConfig } from './types.js'

/** The server-authoritative streak levers a resolver may set. */
export type StreakConfigOverrides = Omit<StreakConfig, 'activity_kind'>

/** Inputs a {@link StreakConfigResolver} receives to decide streak config. */
export interface StreakConfigContext {
  /** The activity kind from the `:activityKind` route param. */
  activityKind: string
  /** The authenticated caller's user id (from the session, never the body). */
  userId: string
}

/**
 * Decides the server-authoritative streak config for a `(activityKind, userId)`
 * pair — e.g. a longer window or a plan-derived freeze cap. Returns only the
 * tunable levers; `activity_kind` is always taken from the route, never the
 * resolver. Registered once at app startup.
 */
export type StreakConfigResolver = (
  context: StreakConfigContext,
) => StreakConfigOverrides | Promise<StreakConfigOverrides>

let resolver: StreakConfigResolver | undefined

/**
 * Register the server-side streak-config resolver. Call once at startup when
 * the app wants non-default windows or freezes. Replaces any prior resolver.
 *
 * @param next - Resolves the streak config for a given activity kind + user.
 */
export function setStreakConfigResolver(next: StreakConfigResolver): void {
  resolver = next
}

/**
 * Get the registered streak-config resolver, or `undefined` when none is set.
 *
 * @returns The resolver, or `undefined`.
 */
export function getStreakConfigResolver(): StreakConfigResolver | undefined {
  return resolver
}

/**
 * Remove the registered resolver (returns whether one existed). Primarily for
 * test isolation.
 *
 * @returns `true` if a resolver was registered and cleared.
 */
export function clearStreakConfigResolver(): boolean {
  const existed = resolver !== undefined
  resolver = undefined
  return existed
}

/**
 * Resolves the server-authoritative {@link StreakConfig} for a request. Uses
 * the registered resolver when present, otherwise platform defaults. Always
 * takes `activity_kind` from the caller-supplied context (the server-derived
 * route param), never from the resolver's return value, and fails safe to
 * defaults when the resolver throws.
 *
 * @param context - The activity kind + authenticated user id.
 * @returns The streak config to use for this request.
 */
export async function resolveStreakConfig(context: StreakConfigContext): Promise<StreakConfig> {
  const defaults: StreakConfig = { activity_kind: context.activityKind }
  if (!resolver) return defaults
  try {
    const overrides = await resolver(context)
    return {
      activity_kind: context.activityKind,
      reset_after_hours: overrides.reset_after_hours,
      freezes_per_period: overrides.freezes_per_period,
    }
  } catch (error) {
    logger.warn('streak config resolver threw; using platform defaults', {
      activityKind: context.activityKind,
      userId: context.userId,
      error,
    })
    return defaults
  }
}
