/**
 * A record of the page's global objects, to name what a module changed when it loaded.
 *
 * A cases file that assigns `Math.random`, defines `crypto.randomUUID` or patches a DOM
 * prototype at import changes it for the whole test file, so every case of every other
 * feature loaded with it sees the change, in an order that depends on module loading. The
 * kit installs such values per case instead (`installCaseGlobals`); this record is how a
 * test finds a module that sets one itself.
 *
 * @module
 */

/** One property as it was: its value, or its accessors. */
interface PropertyRecord {
  value: unknown
  get: unknown
  set: unknown
}

/** Each recorded object's own properties, by the path that reaches it (`Math`, `crypto`, `HTMLCanvasElement.prototype`). */
export type GlobalSnapshot = Map<string, Map<PropertyKey, PropertyRecord>>

/** The objects a component can reach as globals: `globalThis`, and `window` when it is another object. */
const roots = (): object[] => {
  const found: object[] = [globalThis]
  if (typeof window !== 'undefined' && window !== globalThis) found.push(window)
  return found
}

/**
 * The own properties of one object, as records.
 *
 * @param target - The object.
 * @returns Each own property's value or accessors, by key.
 */
const ownProperties = (target: object): Map<PropertyKey, PropertyRecord> =>
  new Map(
    Reflect.ownKeys(target).map((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(target, key)
      return [
        key,
        { value: descriptor?.value, get: descriptor?.get, set: descriptor?.set },
      ] as const
    }),
  )

/**
 * Reads one global property the way a component does, through its getter (`crypto` is an
 * accessor on Node's `globalThis`).
 *
 * @param root - `globalThis` or `window`.
 * @param key - The property.
 * @returns Its current value, or `undefined` when reading it throws.
 */
const readGlobal = (root: object, key: PropertyKey): unknown => {
  try {
    return Reflect.get(root, key)
  } catch (_error) {
    // A getter that throws outside a browser (an unimplemented jsdom accessor) holds
    // nothing a module could have replaced; its own descriptor is still recorded.
    return undefined
  }
}

/** What can hold properties of its own. */
const isObjectLike = (value: unknown): value is object =>
  (typeof value === 'object' && value !== null) || typeof value === 'function'

/**
 * Records the own properties of `globalThis` (and `window`), of each object or function
 * they hold, and of each such function's `prototype`.
 *
 * @returns The snapshot {@link changedGlobals} compares.
 */
export function snapshotGlobals(): GlobalSnapshot {
  const snapshot: GlobalSnapshot = new Map()
  roots().forEach((root, index) => {
    const prefix = index === 0 ? '' : 'window.'
    snapshot.set(prefix || 'globalThis', ownProperties(root))
    for (const key of Reflect.ownKeys(root)) {
      if (typeof key !== 'string') continue
      const value = readGlobal(root, key)
      if (!isObjectLike(value) || value === root) continue
      snapshot.set(`${prefix}${key}`, ownProperties(value))
      const prototype: unknown =
        typeof value === 'function' ? Reflect.get(value, 'prototype') : undefined
      if (isObjectLike(prototype))
        snapshot.set(`${prefix}${key}.prototype`, ownProperties(prototype))
    }
  })
  return snapshot
}

/**
 * Names every property that differs between two snapshots: added, removed, or holding
 * another value or accessor.
 *
 * @param before - The snapshot before the module loaded.
 * @param after - The snapshot after.
 * @returns `Math.random`, `crypto.randomUUID`, `HTMLCanvasElement.prototype.getContext`, …
 */
export function changedGlobals(before: GlobalSnapshot, after: GlobalSnapshot): string[] {
  const changed: string[] = []
  for (const path of new Set([...before.keys(), ...after.keys()])) {
    const was = before.get(path)
    const is = after.get(path)
    if (!was || !is) continue
    for (const key of new Set([...was.keys(), ...is.keys()])) {
      const a = was.get(key)
      const b = is.get(key)
      const same =
        a !== undefined &&
        b !== undefined &&
        Object.is(a.value, b.value) &&
        Object.is(a.get, b.get) &&
        Object.is(a.set, b.set)
      if (!same) changed.push(path === 'globalThis' ? String(key) : `${path}.${String(key)}`)
    }
  }
  return changed
}
