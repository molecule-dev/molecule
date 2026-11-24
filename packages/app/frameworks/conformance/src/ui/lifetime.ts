/**
 * Counts each lifetime probe's creations and disposals in the running case (see
 * `LifetimeSpec` in spec.ts), for the `@lifetime` lines of its snapshots.
 *
 * @module
 */

import { isComponentSpec, isLifetimeSpec, type NodeSpec } from './spec.js'

/**
 * Whether a list holds a lifetime probe at any depth (see `LifetimeSpec`): the list a case's
 * `, with a stateful <list>` step placed it in, or a list inside that list's nodes.
 *
 * @param nodes - The list.
 * @returns Whether one of its nodes is or contains a probe.
 */
export const holdsLifetimeProbe = (nodes: readonly NodeSpec[] | null | undefined): boolean =>
  (nodes ?? []).some(
    (node) =>
      typeof node === 'object' &&
      (isLifetimeSpec(node) ||
        ('children' in node && holdsLifetimeProbe(node.children)) ||
        (isComponentSpec(node) && Object.values(node.slots ?? {}).some(holdsLifetimeProbe))),
  )

/** What a lifetime probe renders once a `lifetime` step flipped its state (see `LifetimeSpec`). */
export const LIFETIME_ON = 'on'

/**
 * The text a `fragment` lifetime probe renders before its flag (see `LifetimeSpec`).
 *
 * @param ordinal - The instance's ordinal in the case (what {@link lifetimeCreated} returned).
 * @returns The text.
 */
export const lifetimeLabel = (ordinal: number): string => `item ${ordinal}`

const lifetimes = new Map<string, { created: number; disposed: number }>()
const changes = new Map<string, Set<() => void>>()

/** Starts a case with no lifetime probe counted. */
export function resetLifetimes(): void {
  lifetimes.clear()
  changes.clear()
}

/**
 * Registers how one live probe instance flips its state; an adapter calls it where the probe's
 * component is set up and calls what it returns from the component's cleanup.
 *
 * @param name - The probe's name.
 * @param change - Flips this instance's flag.
 * @returns Unregisters it.
 */
export function onLifetimeChange(name: string, change: () => void): () => void {
  const set = changes.get(name) ?? new Set<() => void>()
  set.add(change)
  changes.set(name, set)
  return () => {
    set.delete(change)
  }
}

/**
 * Flips every live instance of a probe (the `lifetime` step).
 *
 * @param name - The probe's name.
 */
export function changeLifetimes(name: string): void {
  for (const change of [...(changes.get(name) ?? [])]) change()
}

/**
 * Counts one creation of a lifetime probe; an adapter calls it where its component is set up.
 *
 * @param name - The probe's name.
 * @returns This instance's ordinal in the case, from 1.
 */
export function lifetimeCreated(name: string): number {
  const counts = lifetimes.get(name) ?? { created: 0, disposed: 0 }
  counts.created++
  lifetimes.set(name, counts)
  return counts.created
}

/**
 * Counts one disposal of a lifetime probe; an adapter calls it from its component's cleanup.
 *
 * @param name - The probe's name.
 */
export function lifetimeDisposed(name: string): void {
  const counts = lifetimes.get(name)
  if (counts) counts.disposed++
}

/**
 * The snapshot lines for the case's lifetime probes so far, one per probe by name.
 *
 * @returns The lines, or '' when the case has none.
 */
export function lifetimeLines(): string {
  return [...lifetimes]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(
      ([name, { created, disposed }]) =>
        `@lifetime ${name} created=${created} disposed=${disposed}`,
    )
    .join('\n')
}
