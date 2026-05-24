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

import { bond, get as bondGet, isBonded } from '@molecule/api-bond'

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
 * unconditionally without checking {@link hasSink} first. Delegates to the
 * sink's `record()` otherwise.
 *
 * @param event - The captured activity event to record.
 */
export async function record(event: ActivityEvent): Promise<void> {
  const sink = getSink()
  if (!sink) {
    return
  }
  await sink.record(event)
}
