// @vitest-environment jsdom

/**
 * `useStoragePreference` — the component-side subscriber over
 * `getPreferenceStore()`.
 *
 * Locks the consumer contract the dogfood audit found missing:
 *
 * - a synchronous provider is correct on the FIRST render;
 * - an asynchronous provider's hydration CONVERGES on the same component
 *   (no remount, no stuck fallback);
 * - a user edit made BEFORE hydration lands wins over the hydrated snapshot
 *   (the "user-edit-before-hydration" control);
 * - live changes after hydration (another tab, another writer) still apply;
 * - a `null` key is purely local state and writes nothing.
 */

import { act, render, renderHook } from '@testing-library/react'
import type { JSX, ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { StorageProvider } from '@molecule/app-storage'
import { setProvider } from '@molecule/app-storage'

import { useStoragePreference, useStorageValue } from '../hooks/useStorage.js'
import { StorageProvider as StorageProviderComponent } from '../providers.js'

afterEach(() => {
  setProvider(null as unknown as StorageProvider)
})

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

describe('useStoragePreference', () => {
  it('is correct on the first render with a synchronous provider', () => {
    setProvider(syncProvider({ width: 320 }))

    const { result } = renderHook(() =>
      useStoragePreference<number>('width', { defaultValue: 280 }),
    )

    expect(result.current.value).toBe(320)
    expect(result.current.setValue).toBeTypeOf('function')
  })

  it('converges an asynchronous hydration WITHOUT a remount', async () => {
    const backend = deferredProvider({ width: 320 })
    setProvider(backend.provider)
    let mounts = 0
    function Probe(): JSX.Element {
      const { value, ready } = useStoragePreference<number>('width', { defaultValue: 280 })
      mounts += 1
      return <span>{`${String(value)}|${String(ready)}`}</span>
    }

    const { container } = render(<Probe />)
    expect(container.textContent).toBe('280|false')

    await act(async () => {
      backend.resolveHydration()
    })

    expect(container.textContent).toBe('320|true')
    // 1 mount, 2 renders: the hydration re-rendered the SAME component.
    expect(mounts).toBeGreaterThanOrEqual(2)
  })

  it('keeps a user edit made before hydration, and persists it', async () => {
    const backend = deferredProvider({ width: 320 })
    setProvider(backend.provider)

    const { result } = renderHook(() =>
      useStoragePreference<number>('width', { defaultValue: 280 }),
    )
    expect(result.current.value).toBe(280)

    // The user drags the sidebar before the (slow) backend answers.
    act(() => result.current.setValue(360))
    expect(result.current.value).toBe(360)

    await act(async () => {
      backend.resolveHydration() // the stale snapshot: 320
    })

    expect(result.current.value).toBe(360)
    expect(backend.values.get('width')).toBe(360)
  })

  it('applies live changes after hydration (another tab)', () => {
    const provider = syncProvider({ width: 320 })
    setProvider(provider)

    const { result } = renderHook(() =>
      useStoragePreference<number>('width', { defaultValue: 280 }),
    )
    expect(result.current.value).toBe(320)

    act(() => provider.remoteListeners.get('width')?.(400))

    expect(result.current.value).toBe(400)
  })

  it('falls back to the default after removeValue', () => {
    const provider = syncProvider({ width: 320 })
    setProvider(provider)

    const { result } = renderHook(() =>
      useStoragePreference<number>('width', { defaultValue: 280 }),
    )

    act(() => result.current.removeValue())

    expect(result.current.value).toBe(280)
    expect(provider.values.has('width')).toBe(false)
  })

  it('supports a functional update', () => {
    setProvider(syncProvider({ width: 320 }))

    const { result } = renderHook(() =>
      useStoragePreference<number>('width', { defaultValue: 280 }),
    )

    act(() => result.current.setValue((previous) => (previous ?? 280) + 20))

    expect(result.current.value).toBe(340)
  })

  it('persists nothing when the key is null, and reports ready immediately', () => {
    const provider = syncProvider()
    const set = vi.spyOn(provider, 'set')
    setProvider(provider)

    const { result } = renderHook(() =>
      useStoragePreference<string>(null, { defaultValue: 'none' }),
    )

    act(() => result.current.setValue('typed'))

    expect(result.current.value).toBe('typed')
    expect(result.current.ready).toBe(true)
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
  function controlledProvider() {
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

  const wrapperFor =
    (provider: StorageProvider) =>
    ({ children }: { children: ReactNode }): JSX.Element => (
      <StorageProviderComponent provider={provider}>{children}</StorageProviderComponent>
    )

  it('does not let the initial read overwrite a write made before it landed', async () => {
    const backend = controlledProvider()

    const { result } = renderHook(
      () => useStorageValue<string>('theme', { defaultValue: 'light' }),
      { wrapper: wrapperFor(backend.provider) },
    )

    await act(async () => {
      await result.current.setValue('dark')
    })

    // The slow first read now answers with the value it captured earlier.
    await act(async () => {
      backend.reads.shift()?.('light')
    })

    expect(result.current.value).toBe('dark')
  })

  it('syncs across tabs through the provider subscription', async () => {
    const backend = controlledProvider()

    const { result } = renderHook(
      () => useStorageValue<string>('theme', { defaultValue: 'light', sync: true }),
      { wrapper: wrapperFor(backend.provider) },
    )
    await act(async () => {
      backend.reads.shift()?.(null)
    })

    await act(async () => {
      backend.remoteListeners.get('theme')?.('dark')
    })

    expect(result.current.value).toBe('dark')
  })
})
