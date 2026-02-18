/**
 * Jotai atom utilities.
 *
 * @module
 */

import { atom } from 'jotai/vanilla'

import type { Atom, AtomWithAccessors, JotaiStore, PrimitiveAtom } from './types.js'

/**
 * Creates a primitive atom with get/set functions.
 *
 * @example
 * ```typescript
 * const countAtom = createAtom(0)
 * const count = countAtom.get(store)
 * countAtom.set(store, 10)
 * ```
 * @param initialValue - The starting value for the atom.
 * @returns An `AtomWithAccessors` containing the raw Jotai atom plus `get(store)` and `set(store, value)` helpers.
 */
export const createAtom = <T>(initialValue: T): AtomWithAccessors<T> => {
  const primitiveAtom = atom<T>(initialValue)

  return {
    atom: primitiveAtom,
    get: (store: JotaiStore) => store.get(primitiveAtom),
    set: (store: JotaiStore, value: T | ((prev: T) => T)) => {
      if (typeof value === 'function') {
        const current = store.get(primitiveAtom)
        store.set(primitiveAtom, (value as (prev: T) => T)(current))
      } else {
        store.set(primitiveAtom, value)
      }
    },
  }
}

/**
 * Create a read-only derived (computed) atom whose value is derived from other atoms.
 *
 * @example
 * ```typescript
 * const countAtom = createAtom(0)
 * const doubleCountAtom = createDerivedAtom(
 *   (get) => get(countAtom.atom) * 2
 * )
 * ```
 * @param read - A function that receives `get` and derives a value from other atoms.
 * @returns A read-only Jotai Atom whose value is computed from the read function.
 */
export const createDerivedAtom = <T>(read: (get: <V>(atom: Atom<V>) => V) => T): Atom<T> => {
  return atom(read)
}

/**
 * Create a writable derived atom with both computed read and custom write logic.
 *
 * @example
 * ```typescript
 * const tempCelsiusAtom = createAtom(0)
 * const tempFahrenheitAtom = createWritableDerivedAtom(
 *   (get) => get(tempCelsiusAtom.atom) * 9/5 + 32,
 *   (get, set, newValue: number) => {
 *     set(tempCelsiusAtom.atom, (newValue - 32) * 5/9)
 *   }
 * )
 * ```
 * @param read - A function that receives `get` and derives a value from other atoms.
 * @param write - A function that receives `get`, `set`, and args to update underlying atoms.
 * @returns A writable derived Jotai atom with both read and write capabilities.
 */
export const createWritableDerivedAtom = <T, Args extends unknown[]>(
  read: (get: <V>(atom: Atom<V>) => V) => T,
  write: (
    get: <V>(atom: Atom<V>) => V,
    set: <V>(atom: PrimitiveAtom<V>, value: V) => void,
    ...args: Args
  ) => void,
): Atom<T> & { write: typeof write } => {
  const derivedAtom = atom(read, write)
  return derivedAtom as unknown as Atom<T> & { write: typeof write }
}

/**
 * Create an async atom whose value is fetched asynchronously.
 *
 * @example
 * ```typescript
 * const userAtom = createAsyncAtom(async () => {
 *   const response = await fetch('/api/user')
 *   return response.json()
 * })
 * ```
 * @param asyncFn - An async function that returns the atom's value.
 * @returns A Jotai atom whose value is a Promise, resolved when accessed via useAtom or store.get.
 */
export const createAsyncAtom = <T>(asyncFn: () => Promise<T>): Atom<Promise<T>> => {
  return atom(asyncFn)
}

/**
 * Creates an atom with localStorage persistence.
 *
 * @example
 * ```typescript
 * const themeAtom = createPersistentAtom('theme', 'light')
 * ```
 * @param key - The `localStorage` key to persist under.
 * @param initialValue - The default value if nothing is stored.
 * @param storage - The `Storage` backend to use (defaults to `localStorage`).
 * @returns An `AtomWithAccessors` that automatically persists to storage on set.
 */
export const createPersistentAtom = <T>(
  key: string,
  initialValue: T,
  storage: Storage = typeof localStorage !== 'undefined' ? localStorage : ({} as Storage),
): AtomWithAccessors<T> => {
  // Try to load from storage
  let storedValue = initialValue
  try {
    const stored = storage.getItem(key)
    if (stored) {
      storedValue = JSON.parse(stored)
    }
  } catch {
    // Ignore storage errors
  }

  const primitiveAtom = atom<T>(storedValue)

  return {
    atom: primitiveAtom,
    get: (store: JotaiStore) => store.get(primitiveAtom),
    set: (store: JotaiStore, value: T | ((prev: T) => T)) => {
      let newValue: T
      if (typeof value === 'function') {
        const current = store.get(primitiveAtom)
        newValue = (value as (prev: T) => T)(current)
      } else {
        newValue = value
      }

      store.set(primitiveAtom, newValue)

      try {
        storage.setItem(key, JSON.stringify(newValue))
      } catch {
        // Ignore storage errors
      }
    },
  }
}

/**
 * Create an atom family — a factory function that returns cached atoms keyed by parameter.
 * Each unique parameter value creates a new atom with its own state.
 *
 * @example
 * ```typescript
 * const userByIdAtom = createAtomFamily((id: string) => ({
 *   id,
 *   name: '',
 *   email: '',
 * }))
 *
 * const user1Atom = userByIdAtom('user-1')
 * const user2Atom = userByIdAtom('user-2')
 * ```
 * @param createInitialValue - A factory function that creates the initial value for a given parameter.
 * @returns A parameterized factory function that returns cached AtomWithAccessors instances keyed by parameter.
 */
export const createAtomFamily = <T, P>(
  createInitialValue: (param: P) => T,
): ((param: P) => AtomWithAccessors<T>) => {
  const cache = new Map<P, AtomWithAccessors<T>>()

  return (param: P): AtomWithAccessors<T> => {
    let atomWithAccessors = cache.get(param)
    if (!atomWithAccessors) {
      atomWithAccessors = createAtom(createInitialValue(param))
      cache.set(param, atomWithAccessors)
    }
    return atomWithAccessors
  }
}

/**
 * Combine multiple atoms into a single derived atom whose value is an object
 * with the resolved values of all input atoms.
 *
 * @example
 * ```typescript
 * const countAtom = createAtom(0)
 * const nameAtom = createAtom('')
 *
 * const combinedAtom = combineAtoms({
 *   count: countAtom.atom,
 *   name: nameAtom.atom,
 * })
 * ```
 * @param atoms - A record of named atoms to combine.
 * @returns A derived atom whose value is an object with the resolved values of all input atoms.
 */
export const combineAtoms = <T extends Record<string, Atom<unknown>>>(
  atoms: T,
): Atom<{ [K in keyof T]: T[K] extends Atom<infer V> ? V : never }> => {
  return atom((get: <V>(atom: Atom<V>) => V) => {
    const result = {} as { [K in keyof T]: T[K] extends Atom<infer V> ? V : never }
    for (const key in atoms) {
      result[key] = get(atoms[key]) as (typeof result)[typeof key]
    }
    return result
  })
}
