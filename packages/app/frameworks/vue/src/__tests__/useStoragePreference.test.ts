// @vitest-environment jsdom
/**
 * `useStoragePreference` — the component-side subscriber over
 * `getPreferenceStore()` — plus the two `useStorageValue` ordering cases React
 * keeps in this same file.
 *
 * Locks the consumer contract:
 *
 * - a synchronous provider is correct on the FIRST render;
 * - an asynchronous provider's hydration CONVERGES on the same component
 *   (no remount, no stuck fallback);
 * - a user edit made BEFORE hydration lands wins over the hydrated snapshot;
 * - live changes after hydration (another tab, another writer) still apply;
 * - a `null` key is purely local state and writes nothing.
 */

import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'

import type { StorageProvider } from '@molecule/app-storage'
import { setProvider } from '@molecule/app-storage'

import {
  useStoragePreference,
  useStorageValue,
  type UseStorageValueOptions,
} from '../composables/useStorage.js'
import { moleculePlugin } from '../plugin.js'
import type {
  UseStoragePreferenceOptions,
  UseStoragePreferenceReturn,
  UseStorageValueReturn,
} from '../types.js'

const wrappers: VueWrapper[] = []

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
  // A fresh provider makes the next read see a provider swap, which clears the
  // preference store's cache — the isolation React gets from `setProvider(null)`.
  setProvider(emptyProvider())
  vi.unstubAllGlobals()
})

/**
 * A provider that holds nothing.
 *
 * @returns A storage provider backed by an empty map.
 */
function emptyProvider(): StorageProvider {
  return {
    async get<T = unknown>(_key: string): Promise<T | null> {
      return null
    },
    async set<T = unknown>(_key: string, _value: T): Promise<void> {},
    async remove(_key: string): Promise<void> {},
    async clear(): Promise<void> {},
    async keys(): Promise<string[]> {
      return []
    },
  }
}

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

/**
 * Runs `useStoragePreference` inside a mounted component.
 *
 * @param key - The preference key, or `null`.
 * @param options - The composable options.
 * @returns The composable result.
 */
function runPreference<T>(
  key: string | null,
  options?: UseStoragePreferenceOptions<T>,
): UseStoragePreferenceReturn<T> {
  let captured: UseStoragePreferenceReturn<T> | null = null
  const Probe = defineComponent({
    setup() {
      captured = useStoragePreference<T>(key, options)
      return () => h('div')
    },
  })
  const wrapper = mount(Probe)
  wrappers.push(wrapper)
  if (!captured) throw new Error('useStoragePreference setup did not run')
  return captured
}

/**
 * A provider whose reads the test settles by hand.
 *
 * @returns The provider, its pending reads and its remote listeners.
 */
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

/**
 * Runs `useStorageValue` inside a mounted component under a provider plugin.
 *
 * @param key - The storage key.
 * @param options - The composable options.
 * @param provider - The storage provider the plugin injects.
 * @returns The composable result.
 */
function runStorageValue<T>(
  key: string,
  options: UseStorageValueOptions<T>,
  provider: StorageProvider,
): UseStorageValueReturn<T> {
  let captured: UseStorageValueReturn<T> | null = null
  const Probe = defineComponent({
    setup() {
      captured = useStorageValue<T>(key, options)
      return () => h('div')
    },
  })
  const wrapper = mount(Probe, {
    global: { plugins: [[moleculePlugin, { storage: provider }]] },
  })
  wrappers.push(wrapper)
  if (!captured) throw new Error('useStorageValue setup did not run')
  return captured
}

describe('useStoragePreference', () => {
  it('is correct on the first render with a synchronous provider', () => {
    setProvider(syncProvider({ width: 320 }))

    const result = runPreference<number>('width', { defaultValue: 280 })

    expect(result.value.value).toBe(320)
    expect(result.setValue).toBeTypeOf('function')
  })

  it('converges an asynchronous hydration WITHOUT a remount', async () => {
    const backend = deferredProvider({ width: 320 })
    setProvider(backend.provider)
    let renders = 0
    const Probe = defineComponent({
      setup() {
        const { value, ready } = useStoragePreference<number>('width', { defaultValue: 280 })
        return () => {
          renders += 1
          return h('span', `${String(value.value)}|${String(ready.value)}`)
        }
      },
    })

    const wrapper = mount(Probe)
    wrappers.push(wrapper)
    expect(wrapper.element.textContent).toBe('280|false')

    backend.resolveHydration()
    await vi.waitFor(() => expect(wrapper.element.textContent).toBe('320|true'))
    // One mount, several renders: the hydration re-rendered the SAME component.
    expect(renders).toBeGreaterThanOrEqual(2)
  })

  it('keeps a user edit made before hydration, and persists it', async () => {
    const backend = deferredProvider({ width: 320 })
    setProvider(backend.provider)

    const result = runPreference<number>('width', { defaultValue: 280 })
    expect(result.value.value).toBe(280)

    // The user drags the sidebar before the (slow) backend answers.
    result.setValue(360)
    expect(result.value.value).toBe(360)

    backend.resolveHydration() // the stale snapshot: 320
    await vi.waitFor(() => expect(result.ready.value).toBe(true))

    expect(result.value.value).toBe(360)
    expect(backend.values.get('width')).toBe(360)
  })

  it('applies live changes after hydration (another tab)', () => {
    const provider = syncProvider({ width: 320 })
    setProvider(provider)

    const result = runPreference<number>('width', { defaultValue: 280 })
    expect(result.value.value).toBe(320)

    provider.remoteListeners.get('width')?.(400)

    expect(result.value.value).toBe(400)
  })

  it('falls back to the default after removeValue', () => {
    const provider = syncProvider({ width: 320 })
    setProvider(provider)

    const result = runPreference<number>('width', { defaultValue: 280 })

    result.removeValue()

    expect(result.value.value).toBe(280)
    expect(provider.values.has('width')).toBe(false)
  })

  it('supports a functional update', () => {
    setProvider(syncProvider({ width: 320 }))

    const result = runPreference<number>('width', { defaultValue: 280 })

    result.setValue((previous) => (previous ?? 280) + 20)

    expect(result.value.value).toBe(340)
  })

  it('persists nothing when the key is null, and reports ready immediately', () => {
    const provider = syncProvider()
    const set = vi.spyOn(provider, 'set')
    setProvider(provider)

    const result = runPreference<string>(null, { defaultValue: 'none' })

    result.setValue('typed')

    expect(result.value.value).toBe('typed')
    expect(result.ready.value).toBe(true)
    expect(set).not.toHaveBeenCalled()
  })
})

/**
 * `useStorageValue` (the async context-provider hook) shares the same ordering
 * requirement: its mount read must not replace a value the user already wrote,
 * and cross-tab sync goes through the provider, not the browser global.
 */
describe('useStorageValue', () => {
  it('does not let the initial read overwrite a write made before it landed', async () => {
    const backend = controlledProvider()

    const result = runStorageValue<string>('theme', { defaultValue: 'light' }, backend.provider)

    await result.setValue('dark')

    // The slow first read now answers with the value it captured earlier.
    backend.reads.shift()?.('light')
    await vi.waitFor(() => expect(result.loading.value).toBe(false))

    expect(result.value.value).toBe('dark')
  })

  it('syncs across tabs through the provider subscription', async () => {
    const backend = controlledProvider()

    const result = runStorageValue<string>(
      'theme',
      { defaultValue: 'light', sync: true },
      backend.provider,
    )

    backend.reads.shift()?.(null)
    await vi.waitFor(() => expect(result.loading.value).toBe(false))

    backend.remoteListeners.get('theme')?.('dark')

    expect(result.value.value).toBe('dark')
  })
})
