/**
 * Activity sink bond accessor and convenience functions.
 *
 * Sink bonds (e.g. `@molecule/api-activity-console`) call `setSink()` during
 * setup. Capture provider bonds call the free-function {@link record} after
 * building an {@link ActivityEvent}; if no sink is bonded, `record()` is a
 * silent no-op so capture providers can call it unconditionally.
 *
 * @module
 */

import { bond, get as bondGet, getLogger, isBonded } from '@molecule/api-bond'

import type { ActivityEvent, ActivitySink } from './types.js'

const BOND_TYPE = 'activity-sink'

/**
 * Registers an activity sink as the active singleton. Called by sink bond
 * packages during application startup.
 *
 * @param sink - The activity sink implementation to bond.
 */
export function setSink(sink: ActivitySink): void {
  bond(BOND_TYPE, sink)
}

/**
 * Retrieves the bonded activity sink, or `null` if none is bonded.
 *
 * @returns The bonded activity sink, or `null`.
 */
export function getSink(): ActivitySink | null {
  return bondGet<ActivitySink>(BOND_TYPE) ?? null
}

/**
 * Checks whether an activity sink is currently bonded.
 *
 * @returns `true` if an activity sink is bonded.
 */
export function hasSink(): boolean {
  return isBonded(BOND_TYPE)
}

/**
 * Records a captured activity event to the bonded sink.
 *
 * No-ops silently if no sink is bonded, so capture providers can call this
 * unconditionally without checking {@link hasSink} first. Otherwise
 * delegates to the sink's `record()` — best-effort: a sink that throws or
 * rejects is caught and logged (`logger.warn`), never re-thrown, so a
 * broken/unreachable activity sink can never break the business operation
 * (send email, enqueue job, etc.) that emitted the event. `ActivitySink`
 * implementations are already documented to catch their own errors; this is
 * belt-and-suspenders for a sink that doesn't honor that.
 *
 * @param event - The captured activity event to record.
 */
export async function record(event: ActivityEvent): Promise<void> {
  const sink = getSink()
  if (!sink) {
    return
  }
  try {
    await sink.record(event)
  } catch (error) {
    getLogger().warn('Activity sink failed to record event; continuing (best-effort)', {
      eventId: event.id,
      eventType: event.type,
      error,
    })
  }
}
