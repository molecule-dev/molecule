// @vitest-environment jsdom

/**
 * `useStorageValue` (the async context-provider primitive), the Solid
 * counterpart of React's `useStorageValue` cases: its mount read must not
 * replace a value the user already wrote, and cross-tab sync goes through the
 * provider, not the browser global.
 *
 * Also carries React's `useStorageValue` file cases: `loading` and `value` stay
 * true to the key they were given — a write that lands before the first read
 * still ends loading, a new key starts over, and an object `defaultValue`
 * written inline does not re-read.
 *
 * @module
 */

import { createRoot, createSignal, type JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it } from 'vitest'

import type { StorageProvider } from '@molecule/app-storage'

import { StorageContext } from '../context.js'
import type { MaybeAccessor } from '../primitives/maybe-accessor.js'
import { useStorageValue, type UseStorageValueOptions } from '../primitives/storage.js'

const disposers: Array<() => void> = []

/**
 * Renders a Solid tree into the document and keeps its cleanup.
 *
 * @param app - The tree to render.
 * @returns The container it rendered into.
 */
function mount(app: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(app, container)
  disposers.push(() => {
    dispose()
    container.remove()
  })
  return container
}

/**
 * Lets queued microtasks and timers run.
 *
 * @returns A promise resolved after the pending work.
 */
async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })
  }
}

/**
 * Mounts `useStorageValue` under a storage provider and captures the result.
 *
 * @param provider - The provider to supply through context.
 * @param key - The storage key, or an accessor of it.
 * @param options - Default value and cross-tab sync.
 * @returns The primitive's result.
 */
function mountValue<T>(
  provider: StorageProvider,
  key: MaybeAccessor<string>,
  options?: MaybeAccessor<UseStorageValueOptions<T>>,
): ReturnType<typeof useStorageValue<T>> {
  let captured: ReturnType<typeof useStorageValue<T>> | undefined

  /**
   * Calls the primitive under the provider and captures it.
   *
   * @returns Nothing rendered.
   */
  function Probe(): null {
    captured = useStorageValue<T>(key, options)
    return null
  }

  mount(() => (
    <StorageContext.Provider value={provider}>
      <Probe />
    </StorageContext.Provider>
  ))
  if (!captured) throw new Error('useStorageValue was not captured')
  return captured
}

/**
 * A provider whose reads stay pending until the test answers them.
 *
 * @param contents - What a read answers with, per key.
 * @returns The provider, a read counter and the answer function.
 */
function heldStorage(contents: Record<string, unknown> = {}): {
  provider: StorageProvider
  readCount: () => number
  answer: () => void
} {
  const values = new Map(Object.entries(contents))
  const pending: Array<() => void> = []
  let reads = 0
  const provider: StorageProvider = {
    get<T = unknown>(key: string): Promise<T | null> {
      reads += 1
      return new Promise<T | null>((resolve) => {
        pending.push(() => resolve((values.has(key) ? values.get(key) : null) as T | null))
      })
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
  }
  return {
    provider,
    readCount: () => reads,
    answer: () => {
      pending.shift()?.()
    },
  }
}

/**
 * A provider whose reads the test settles by hand, with remote listeners.
 *
 * @returns The provider, its pending reads and the listeners another tab hits.
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
    async set(): Promise<void> {},
    async remove(): Promise<void> {},
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

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

describe('useStorageValue', () => {
  it('does not let the initial read overwrite a write made before it landed', async () => {
    const backend = controlledProvider()

    const result = mountValue<string>(backend.provider, 'theme', { defaultValue: 'light' })

    await result.setValue('dark')

    // The slow first read now answers with the value it captured earlier.
    backend.reads.shift()?.('light')
    await settle()

    expect(result.value()).toBe('dark')
  })

  it('syncs across tabs through the provider subscription', async () => {
    const backend = controlledProvider()

    const result = mountValue<string>(backend.provider, 'theme', {
      defaultValue: 'light',
      sync: true,
    })
    backend.reads.shift()?.(null)
    await settle()

    backend.remoteListeners.get('theme')?.('dark')
    await settle()

    expect(result.value()).toBe('dark')
  })

  it('ends loading when a write lands before the first read, keeping the written value', async () => {
    const storage = heldStorage({ theme: 'light' })
    const result = mountValue<string>(storage.provider, 'theme', { defaultValue: 'x' })
    expect(result.loading()).toBe(true)

    await result.setValue('dark')
    storage.answer()
    await settle()

    expect({ value: result.value(), loading: result.loading(), error: result.error() }).toEqual({
      value: 'dark',
      loading: false,
      error: null,
    })
  })

  it('starts over when the key changes', async () => {
    const storage = heldStorage({ a: 'value of a', b: 'value of b' })
    const [key, setKey] = createSignal('a')
    const result = mountValue<string>(storage.provider, key, { defaultValue: 'default' })
    storage.answer()
    await settle()
    expect({ value: result.value(), loading: result.loading() }).toEqual({
      value: 'value of a',
      loading: false,
    })

    setKey('b')
    expect({ value: result.value(), loading: result.loading() }).toEqual({
      value: 'default',
      loading: true,
    })

    storage.answer()
    await settle()
    expect({ value: result.value(), loading: result.loading() }).toEqual({
      value: 'value of b',
      loading: false,
    })
  })

  it('reads once for an object defaultValue written inline', async () => {
    const storage = heldStorage()
    // A fresh options object on every read, like the inline literal React
    // re-creates on every render.
    const [tick, setTick] = createSignal(0)
    const result = mountValue<{ size: number }>(storage.provider, 'prefs', () => {
      tick()
      return { defaultValue: { size: 1 }, sync: false }
    })
    storage.answer()
    await settle()
    expect(result.loading()).toBe(false)

    // A reactive re-read of the options must not start another storage read.
    createRoot(() => {
      setTick(1)
    })
    await settle()

    expect(result.value()).toEqual({ size: 1 })
    expect(storage.readCount()).toBe(1)
  })
})
