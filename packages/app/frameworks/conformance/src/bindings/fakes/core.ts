/**
 * Binding-case fakes for the core service hooks (state stores, storage
 * preferences and loggers: `useStore`, `useStorage*`, `useLogger*`).
 *
 * A case seeds this area through `context.areas.core`; `control` steps call
 * the controls registered here (named `core.<action>`). Every call a hook
 * makes on these fakes goes to `record`, so it is compared like any other call:
 *
 * - stores: a case seeds `stores: { counter: { initialState: { … } } }` and
 *   passes the store as `{ $ref: 'core.counter' }`. Writes made THROUGH the
 *   hook (`useSetStore`, `useStoreAction`) record `core.counter.setState`;
 *   the `core.counter.set` control writes from outside without recording
 *   (like the kit's unrecorded `storage` step), so only the hook's own writes
 *   appear in the calls list. Subscription counts feed the leak check.
 * - selectors and actions: `{ $ref: 'core.selectCount' }` etc. are real
 *   functions that record what the hook handed them (the full state, the
 *   previous value) and then compute, so a selected value still follows the
 *   store. `{ $fn }` markers cannot do this (they return a constant).
 * - storage: seeding `storage` replaces and bonds a storage provider the case
 *   controls. The kit's base provider records only writes and offers no
 *   synchronous read, no change subscription and no way to fail or defer a
 *   read; this one records reads too (`storage.get`, `storage.getSync`,
 *   `storage.keys`, `storage.subscribe`), can stay pending until the
 *   `core.storage.reply` control settles a read, can reject reads or writes,
 *   and takes the kit's `storage` step as an outside write (another tab): it
 *   stores the value (`null` removes the key) and notifies its subscribers.
 *   `useStoragePreference` needs the bond: it reads the module-singleton
 *   preference store over the BONDED provider, not the React context.
 *
 * @module
 */

import { createSimpleStateProvider, shallowEqual, type Store } from '@molecule/app-state'
import { getProvider, setProvider, type StorageProvider } from '@molecule/app-storage'

import type { AreaFakesFactory } from '../spec.js'

/** The state shape of every seeded store. */
type CoreStoreState = Record<string, unknown>

/** Receives a recorded call (the kit normalizes the arguments). */
type Recorder = (name: string, args: unknown[]) => void

/** Seed for one store exposed as the ref `core.<name>`. */
export interface CoreStoreSeed {
  /** The store's initial state. */
  initialState: CoreStoreState
}

/**
 * Seed for the storage provider this area builds, replaces `services.storage`
 * with and bonds under `@molecule/app-storage` (so `getPreferenceStore()` and
 * the framework's storage context see the same provider).
 */
export interface CoreStorageSeed {
  /**
   * `true` adds a synchronous `getSync` read (the browser-localStorage shape),
   * so `useStoragePreference` can answer on the first render. Default
   * `false`: reads are asynchronous only (the native/encrypted shape).
   */
  sync?: boolean
  /**
   * `true` keeps every read pending until the `core.storage.reply` control
   * settles it with the case's value — the pending, loading and
   * hydration-race states.
   */
  deferReads?: boolean
  /** Reads reject with `new Error(message)` instead of answering. */
  failReads?: string
  /** `set`, `remove` and `clear` record the call and reject with `new Error(message)`. */
  failWrites?: string
  /**
   * Initial contents; defaults to the case's top-level `context.storage` seed.
   */
  seed?: Record<string, unknown>
}

/** What a case can seed for this area (`context.areas.core`). */
export interface CoreSeed {
  /** Stores exposed to hook arguments as `{ $ref: 'core.<name>' }`. */
  stores?: Record<string, CoreStoreSeed>
  /** Builds, provides and bonds the area's storage provider (see {@link CoreStorageSeed}). */
  storage?: CoreStorageSeed
}

/** What `buildSeededStore` returns for one store name. */
interface SeededStore {
  /** The store a case passes as `{ $ref: 'core.<name>' }`. */
  ref: Store<CoreStoreState>
  /** Writes from outside a `core.<name>.set` control performs (unrecorded). */
  set: (
    partial: Partial<CoreStoreState> | ((state: CoreStoreState) => Partial<CoreStoreState>),
  ) => void
  /** Subscriptions the store still holds (the leak check). */
  listenerCount: () => number
}

/**
 * Creates one recorded, subscribable store.
 *
 * `setState` is wrapped so a write made THROUGH the hook records
 * `core.<name>.setState` (a functional updater records as `'[function]'` — its
 * own `{ $fn }` records the state it received); `getState` is left bare
 * because a render-time read must not depend on render counts.
 *
 * @param name - The store's name (`core.<name>`).
 * @param initialState - Its initial state.
 * @param record - Receives the hook's writes.
 * @returns The store ref, an unrecorded outside write and the listener count.
 */
function buildSeededStore(
  name: string,
  initialState: CoreStoreState,
  record: Recorder,
): SeededStore {
  const raw = createSimpleStateProvider().createStore({ initialState, name })
  let listeners = 0
  const ref: Store<CoreStoreState> = {
    getState: raw.getState,
    setState: (partial) => {
      record(`core.${name}.setState`, [partial])
      raw.setState(partial)
    },
    subscribe: (listener) => {
      listeners += 1
      const stop = raw.subscribe(listener)
      let active = true
      return () => {
        if (active) listeners -= 1
        active = false
        stop()
      }
    },
    destroy: raw.destroy,
  }
  return { ref, set: (partial) => raw.setState(partial), listenerCount: () => listeners }
}

/**
 * Creates the selector, equality and action refs every case may pass to a
 * state hook. Each records what the hook handed it, then computes, so the
 * selected value still follows the store (a `{ $fn }` returns a constant and
 * cannot).
 *
 * @param record - Receives each call (`core.selectCount`, `core.increment`, …).
 * @returns The refs, keyed by their `{ $ref }` name.
 */
function buildStoreArgumentRefs(record: Recorder): Record<string, unknown> {
  return {
    /** Selects `state.count`; records the full state it was handed. */
    'core.selectCount': (state: CoreStoreState): unknown => {
      record('core.selectCount', [state])
      return state.count
    },
    /** Selects a fresh `{ n: count }` object, for the equalityFn contract. */
    'core.selectSlice': (state: CoreStoreState): unknown => {
      record('core.selectSlice', [state])
      return { n: state.count }
    },
    /** Shallow equality over the selected values; records both operands. */
    'core.shallowEqual': (a: unknown, b: unknown): boolean => {
      record('core.shallowEqual', [a, b])
      return shallowEqual(a, b)
    },
    /**
     * `useStoreAction` action: adds its numeric argument to `count` through
     * the `setState`/`getState` the hook passed.
     */
    'core.increment':
      (setState: Store<CoreStoreState>['setState'], getState: Store<CoreStoreState>['getState']) =>
      (by: unknown): void => {
        record('core.increment', [by])
        setState({ count: Number(getState().count ?? 0) + Number(by ?? 0) })
      },
    /**
     * `useStoreAction` action that returns a value derived from fresh state,
     * pinning the action's return value for the caller.
     */
    'core.label':
      (_setState: Store<CoreStoreState>['setState'], getState: Store<CoreStoreState>['getState']) =>
      (prefix: unknown): string => {
        record('core.label', [prefix])
        return `${String(prefix)}-${String(getState().count ?? 0)}`
      },
  }
}

/** What `buildCoreStorage` returns: the provider plus the case's controls. */
interface CoreStorage {
  /** The provider: recorded reads, optional `getSync`, change subscription. */
  provider: StorageProvider
  /** Resolves the oldest deferred read with the control's value. */
  reply: (value: unknown) => void
  /** An outside write (another tab): stores the value (`null` removes it) and notifies subscribers. */
  emit: (key: string, value: unknown) => void
  /** Change subscriptions the provider still holds (the leak check). */
  listenerCount: () => number
}

/**
 * Creates the area's storage provider. Reads record (`storage.get`,
 * `storage.getSync`, `storage.keys`) as do writes (`storage.set`,
 * `storage.remove`, `storage.clear`); reads can defer or fail per the seed;
 * `subscribe` records and feeds `emit`. Writes through this provider do not
 * notify its own subscribers — an outside write is the kit's `storage` step, the
 * same contract the kit's base provider family documents.
 *
 * @param seed - The case's storage seed.
 * @param contents - Initial key→value contents.
 * @param record - Receives every call a hook makes on the provider.
 * @returns The provider and its controls.
 */
function buildCoreStorage(
  seed: CoreStorageSeed,
  contents: Record<string, unknown>,
  record: Recorder,
): CoreStorage {
  const values = new Map<string, unknown>(Object.entries(contents))
  const pendingReads: Array<{ resolve: (value: unknown) => void }> = []
  const listeners = new Map<string, Set<(value: unknown) => void>>()
  const failWrites = (): void => {
    if (seed.failWrites) throw new Error(seed.failWrites)
  }
  const provider: StorageProvider = {
    get: async <T = unknown>(key: string): Promise<T | null> => {
      record('storage.get', [key])
      if (seed.failReads) throw new Error(seed.failReads)
      if (seed.deferReads) {
        return new Promise<T | null>((resolve) => {
          pendingReads.push({ resolve: resolve as (value: unknown) => void })
        })
      }
      return (values.has(key) ? values.get(key) : null) as T | null
    },
    set: async <T = unknown>(key: string, value: T): Promise<void> => {
      record('storage.set', [key, value])
      failWrites()
      values.set(key, value)
    },
    remove: async (key: string): Promise<void> => {
      record('storage.remove', [key])
      failWrites()
      values.delete(key)
    },
    clear: async (): Promise<void> => {
      record('storage.clear', [])
      failWrites()
      values.clear()
    },
    keys: async (): Promise<string[]> => {
      record('storage.keys', [])
      return [...values.keys()]
    },
    ...(seed.sync
      ? {
          getSync: <T = unknown>(key: string): T | null => {
            record('storage.getSync', [key])
            return (values.has(key) ? values.get(key) : null) as T | null
          },
        }
      : {}),
    subscribe: (key: string, listener: (value: unknown) => void): (() => void) => {
      record('storage.subscribe', [key])
      const set = listeners.get(key) ?? new Set()
      listeners.set(key, set)
      set.add(listener)
      return () => {
        set.delete(listener)
      }
    },
  }
  return {
    provider,
    reply: (value) => {
      pendingReads.shift()?.resolve(value)
    },
    emit: (key, value) => {
      if (value === null || value === undefined) values.delete(key)
      else values.set(key, value)
      for (const listener of [...(listeners.get(key) ?? [])]) listener(value)
    },
    listenerCount: () => [...listeners.values()].reduce((total, set) => total + set.size, 0),
  }
}

/**
 * Builds this area's fakes for one case: seeded stores (as refs), the shared
 * selector/action refs, and — when `context.areas.core.storage` is seeded — a
 * recorded storage provider that replaces `services.storage` and is bonded
 * under `@molecule/app-storage` until `dispose`.
 *
 * @param context - The case context (`context.areas?.core` is this area's seed).
 * @param record - Receives every call a hook makes on this area's fakes.
 * @returns The area's services, controls, listener counts and cleanup.
 */
export const createCoreFakes: AreaFakesFactory = (context, record) => {
  const seed = context.areas?.core
  const refs: Record<string, unknown> = buildStoreArgumentRefs(record)
  const controls: Record<string, (...args: unknown[]) => unknown> = {}
  const listenerCounts: Record<string, () => number> = {}

  for (const [name, storeSeed] of Object.entries(seed?.stores ?? {})) {
    const store = buildSeededStore(name, storeSeed.initialState, record)
    refs[`core.${name}`] = store.ref
    controls[`core.${name}.set`] = (partial) => {
      store.set(partial as Partial<CoreStoreState>)
    }
    listenerCounts[`core.${name}`] = store.listenerCount
  }

  let storage: CoreStorage | undefined
  if (seed?.storage) {
    storage = buildCoreStorage(seed.storage, seed.storage.seed ?? context.storage ?? {}, record)
    // Bond it for `getPreferenceStore()` (which reads the bond, not the React
    // context) and remember what was bonded before, so dispose restores it.
    let bondedBefore = false
    let previous: StorageProvider | null = null
    try {
      previous = getProvider()
      bondedBefore = true
    } catch (_error) {
      // getProvider throws while the slot is empty (or holds the teardown null);
      // dispose then restores that empty slot.
      bondedBefore = false
    }
    setProvider(storage.provider)
    controls['core.storage.reply'] = (value) => {
      storage!.reply(value)
    }
    listenerCounts['core.storage'] = storage.listenerCount
    const restore = (): void => {
      // `null` is the documented teardown bond (reads as "no provider"); a
      // next case's fresh provider makes the preference store swap and clear.
      setProvider((bondedBefore ? previous : null) as StorageProvider)
    }
    return {
      services: { storage: storage.provider },
      writeStorage: (key, value) => storage!.emit(key, value),
      controls,
      refs,
      listeners: () => mapCounts(listenerCounts),
      dispose: restore,
    }
  }

  return {
    controls,
    refs,
    listeners: () => mapCounts(listenerCounts),
  }
}

/**
 * Evaluates the per-store listener counters for the leak check.
 *
 * @param counts - The counters keyed by their report name.
 * @returns The current counts.
 */
function mapCounts(counts: Record<string, () => number>): Record<string, number> {
  return Object.fromEntries(Object.entries(counts).map(([name, count]) => [name, count()]))
}
