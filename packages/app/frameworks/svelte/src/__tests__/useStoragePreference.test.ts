// @vitest-environment jsdom

/**
 * `useStoragePreference` — the component-side subscriber over
 * `getPreferenceStore()`, React's case in Svelte's idiom: the value and the
 * `ready` flag are readable stores, and `setValue`/`removeValue` are plain
 * functions.
 *
 * Locks the consumer contract the dogfood audit found missing:
 *
 * - a synchronous provider is correct on the FIRST read;
 * - an asynchronous provider's hydration CONVERGES on the same component
 *   (no remount, no stuck fallback);
 * - a user edit made BEFORE hydration lands wins over the hydrated snapshot
 *   (the "user-edit-before-hydration" control);
 * - live changes after hydration (another tab, another writer) still apply;
 * - a `null` key is purely local state and writes nothing.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { get } from 'svelte/store'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'
import type { StorageProvider } from '@molecule/app-storage'
import { setProvider } from '@molecule/app-storage'

import { setMoleculeContext } from '../context.js'
import {
  useStoragePreference,
  type UseStoragePreferenceResult,
  useStorageValue,
} from '../hooks/useStorage.js'

/** A synchronous provider — the browser localStorage shape. */
function syncProvider(initial: Record<string, unknown> = {}): StorageProvider & {
  values: Map<string, unknown>
  remoteListeners: Map<string, (value: unknown) => void>
} {
  const values = new Map<string, unknown>(Object.entries(initial))
  const remoteListeners = new Map<string, (value: unknown) => void>()
  const provider: StorageProvider = {
    async get<T = unknown>(key: string): Promise<T | null> {
      return values.has(key) ? (values.get(key) as T) : null
    },
    async set<T = unknown>(key: string, value: T): Promise<void> {
      values.set(key, value)
    },
    async remove(key: string): Promise<void> {
      values.delete(key)
    },
    async clear(): Promise<void> {
      values.clear()
    },
    async keys(): Promise<string[]> {
      return [...values.keys()]
    },
    getSync<T = unknown>(key: string): T | null {
      return values.has(key) ? (values.get(key) as T) : null
    },
    subscribe(key: string, listener: (value: unknown) => void): () => void {
      remoteListeners.set(key, listener)
      return () => remoteListeners.delete(key)
    },
  }
  return Object.assign(provider, { values, remoteListeners })
}

/**
 * An asynchronous provider whose hydration a test resolves by hand — the native
 * / encrypted shape, where the first read lands after the first paint.
 *
 * @param initial - The values the provider starts with.
 * @returns The provider, its values, and a function that answers the pending batch read.
 */
function deferredProvider(initial: Record<string, unknown> = {}): {
  provider: StorageProvider
  values: Map<string, unknown>
  resolveHydration: (values?: Map<string, unknown | null>) => void
} {
  const values = new Map<string, unknown>(Object.entries(initial))
  const batches: Array<(values: Map<string, unknown | null>) => void> = []
  const provider: StorageProvider = {
    async get<T = unknown>(key: string): Promise<T | null> {
      return values.has(key) ? (values.get(key) as T) : null
    },
    async set<T = unknown>(key: string, value: T): Promise<void> {
      values.set(key, value)
    },
    async remove(key: string): Promise<void> {
      values.delete(key)
    },
    async clear(): Promise<void> {
      values.clear()
    },
    async keys(): Promise<string[]> {
      return [...values.keys()]
    },
    getMany<T = unknown>(_keys: string[]): Promise<Map<string, T | null>> {
      return new Promise<Map<string, T | null>>((resolve) => {
        batches.push((result) => resolve(result as Map<string, T | null>))
      })
    },
  }
  return {
    provider,
    values,
    resolveHydration: (result) => {
      const keys = result ?? new Map<string, unknown | null>(values)
      batches.shift()?.(keys as Map<string, unknown | null>)
    },
  }
}

/** The mounted hosts this file tears down after each case. */
const hosts: Array<() => Promise<void>> = []

/**
 * Mounts a host that runs the given hook during a child's init under a storage
 * context, and returns what the hook returned.
 *
 * @param provider - The storage provider the context carries.
 * @param run - Calls the hook; its return value is kept.
 * @returns The hook's result and the host's unmount.
 */
function mountStorage<T>(
  provider: StorageProvider,
  run: () => T,
): { result: T; stop: () => Promise<void> } {
  const captured: { result?: T } = {}
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = mount(Host, {
    target: container,
    props: {
      config: { storage: provider },
      setMoleculeContext,
      run: () => {
        captured.result = run()
      },
    },
  })
  flushSync()
  const stop = async (): Promise<void> => {
    await unmount(app)
    container.remove()
  }
  hosts.push(stop)
  if (captured.result === undefined) throw new Error('the host never ran the hook')
  return { result: captured.result, stop }
}

/**
 * Mounts a host that runs `useStoragePreference` during a child's init. The
 * preference store is bonded through `setProvider`, not the context.
 *
 * @param run - Calls the hook; its return value is kept.
 * @returns The hook's result and the host's unmount.
 */
function mountPreference<T>(run: () => UseStoragePreferenceResult<T>): {
  result: UseStoragePreferenceResult<T>
  stop: () => Promise<void>
} {
  const captured: { result?: UseStoragePreferenceResult<T> } = {}
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = mount(Host, {
    target: container,
    props: {
      config: {},
      setMoleculeContext,
      run: () => {
        captured.result = run()
      },
    },
  })
  flushSync()
  const stop = async (): Promise<void> => {
    await unmount(app)
    container.remove()
  }
  hosts.push(stop)
  if (captured.result === undefined) throw new Error('the host never ran the hook')
  return { result: captured.result, stop }
}

afterEach(async () => {
  for (const stop of hosts.splice(0)) await stop()
  // An empty provider resets the singleton preference store between cases.
  setProvider(syncProvider())
})

describe('useStoragePreference', () => {
  it('is correct on the first render with a synchronous provider', () => {
    setProvider(syncProvider({ width: 320 }))

    const { result } = mountPreference(() =>
      useStoragePreference<number>('width', { defaultValue: 280 }),
    )

    expect(get(result.value)).toBe(320)
    expect(result.setValue).toBeTypeOf('function')
  })

  it('converges an asynchronous hydration WITHOUT a remount', async () => {
    const backend = deferredProvider({ width: 320 })
    setProvider(backend.provider)
    const { result } = mountPreference(() =>
      useStoragePreference<number>('width', { defaultValue: 280 }),
    )
    const valueStore = result.value
    expect(get(result.value)).toBe(280)
    expect(get(result.ready)).toBe(false)

    backend.resolveHydration()

    await vi.waitFor(() => expect(get(result.ready)).toBe(true))
    expect(get(result.value)).toBe(320)
    // The same store converged in place: the component never remounted.
    expect(result.value).toBe(valueStore)
  })

  it('keeps a user edit made before hydration, and persists it', async () => {
    const backend = deferredProvider({ width: 320 })
    setProvider(backend.provider)

    const { result } = mountPreference(() =>
      useStoragePreference<number>('width', { defaultValue: 280 }),
    )
    expect(get(result.value)).toBe(280)

    // The user drags the sidebar before the (slow) backend answers.
    result.setValue(360)
    expect(get(result.value)).toBe(360)

    backend.resolveHydration() // the stale snapshot: 320

    await vi.waitFor(() => expect(get(result.ready)).toBe(true))
    expect(get(result.value)).toBe(360)
    expect(backend.values.get('width')).toBe(360)
  })

  it('applies live changes after hydration (another tab)', async () => {
    const provider = syncProvider({ width: 320 })
    setProvider(provider)

    const { result } = mountPreference(() =>
      useStoragePreference<number>('width', { defaultValue: 280 }),
    )
    expect(get(result.value)).toBe(320)

    provider.remoteListeners.get('width')?.(400)

    expect(get(result.value)).toBe(400)
  })

  it('falls back to the default after removeValue', () => {
    const provider = syncProvider({ width: 320 })
    setProvider(provider)

    const { result } = mountPreference(() =>
      useStoragePreference<number>('width', { defaultValue: 280 }),
    )

    result.removeValue()

    expect(get(result.value)).toBe(280)
    expect(provider.values.has('width')).toBe(false)
  })

  it('supports a functional update', () => {
    setProvider(syncProvider({ width: 320 }))

    const { result } = mountPreference(() =>
      useStoragePreference<number>('width', { defaultValue: 280 }),
    )

    result.setValue((previous) => (previous ?? 280) + 20)

    expect(get(result.value)).toBe(340)
  })

  it('persists nothing when the key is null, and reports ready immediately', () => {
    const provider = syncProvider()
    const set = vi.spyOn(provider, 'set')
    setProvider(provider)

    const { result } = mountPreference(() =>
      useStoragePreference<string>(null, { defaultValue: 'none' }),
    )

    result.setValue('typed')

    expect(get(result.value)).toBe('typed')
    expect(get(result.ready)).toBe(true)
    expect(set).not.toHaveBeenCalled()
  })
})

/**
 * `useStorageValue` (the async context-provider hook) shares the same ordering
 * requirement: its mount read must not replace a value the user already wrote,
 * and cross-tab sync goes through the provider, not the browser global.
 */
describe('useStorageValue', () => {
  /** A provider whose reads the test settles by hand. */
  function controlledProvider(): {
    provider: StorageProvider
    reads: Array<(value: unknown) => void>
    remoteListeners: Map<string, (value: unknown) => void>
  } {
    const reads: Array<(value: unknown) => void> = []
    const remoteListeners = new Map<string, (value: unknown) => void>()
    const provider: StorageProvider = {
      get<T = unknown>(_key: string): Promise<T | null> {
        return new Promise<T | null>((resolve) => reads.push((value) => resolve(value as T | null)))
      },
      set: vi.fn(async () => {}),
      remove: vi.fn(async () => {}),
      async clear(): Promise<void> {},
      async keys(): Promise<string[]> {
        return []
      },
      subscribe(key: string, listener: (value: unknown) => void): () => void {
        remoteListeners.set(key, listener)
        return () => remoteListeners.delete(key)
      },
    }
    return { provider, reads, remoteListeners }
  }

  it('does not let the initial read overwrite a write made before it landed', async () => {
    const backend = controlledProvider()

    const { result } = mountStorage(backend.provider, () =>
      useStorageValue<string>('theme', { defaultValue: 'light' }),
    )

    await result.setValue('dark')

    // The slow first read now answers with the value it captured earlier.
    backend.reads.shift()?.('light')

    await vi.waitFor(() => expect(get(result.loading)).toBe(false))
    expect(get(result.value)).toBe('dark')
  })

  it('syncs across tabs through the provider subscription', async () => {
    const backend = controlledProvider()

    const { result } = mountStorage(backend.provider, () =>
      useStorageValue<string>('theme', { defaultValue: 'light', sync: true }),
    )
    backend.reads.shift()?.(null)
    await vi.waitFor(() => expect(get(result.loading)).toBe(false))

    backend.remoteListeners.get('theme')?.('dark')

    expect(get(result.value)).toBe('dark')
  })
})
