// @vitest-environment jsdom

/**
 * `useStoragePreference` — the Solid counterpart of React's
 * `__tests__/useStoragePreference.test.tsx`: the component-side subscriber over
 * `getPreferenceStore()`.
 *
 * The same contract React pins, observed through Solid accessors:
 *
 * - a synchronous provider is correct on the FIRST read;
 * - an asynchronous provider's hydration CONVERGES on the same component
 *   (no remount, no stuck fallback);
 * - a user edit made BEFORE hydration lands wins over the hydrated snapshot
 *   (the "user-edit-before-hydration" control);
 * - live changes after hydration (another tab, another writer) still apply;
 * - a `null` key is purely local state and writes nothing.
 *
 * Solid has no re-renders: a component body runs once, so React's "the same
 * component re-rendered" becomes "the same component's DOM updated and its
 * setup ran once".
 *
 * @module
 */

import { createRoot, type JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { StorageProvider } from '@molecule/app-storage'
import { setProvider } from '@molecule/app-storage'

import { useStoragePreference } from '../primitives/storage.js'

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
 * Runs a primitive in a disposable reactive root, the way a component does.
 *
 * @param create - Creates the primitive.
 * @returns Whatever the primitive's caller returns.
 */
function root<T>(create: () => T): T {
  return createRoot((dispose) => {
    disposers.push(dispose)
    return create()
  })
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
 * A synchronous provider — the browser localStorage shape.
 *
 * @param initial - The values the provider starts with.
 * @returns The provider, its values, and the listeners another tab would hit.
 */
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
 * @returns The provider, its values, and the hydration resolver.
 */
function deferredProvider(initial: Record<string, unknown> = {}): {
  provider: StorageProvider
  values: Map<string, unknown>
  resolveHydration: (result?: Map<string, unknown | null>) => void
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
      const hydrated = result ?? new Map<string, unknown | null>(values)
      batches.shift()?.(hydrated)
    },
  }
}

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  // A fresh provider object is the typed way to detach the previous test's
  // backend: the preference store re-attaches when the provider identity moves.
  setProvider(syncProvider())
})

describe('useStoragePreference', () => {
  it('is correct on the first render with a synchronous provider', () => {
    setProvider(syncProvider({ width: 320 }))

    const result = root(() => useStoragePreference<number>('width', { defaultValue: 280 }))

    expect(result.value()).toBe(320)
    expect(result.setValue).toBeTypeOf('function')
  })

  it('converges an asynchronous hydration WITHOUT a remount', async () => {
    const backend = deferredProvider({ width: 320 })
    setProvider(backend.provider)
    let setups = 0

    /**
     * Shows the preference as one text node.
     *
     * @returns The probe.
     */
    function Probe(): JSX.Element {
      const { value, ready } = useStoragePreference<number>('width', { defaultValue: 280 })
      setups += 1
      return <span>{`${String(value())}|${String(ready())}`}</span>
    }

    const container = mount(() => <Probe />)
    expect(container.textContent).toBe('280|false')

    backend.resolveHydration()
    await settle()

    expect(container.textContent).toBe('320|true')
    // One setup, DOM updated in place: the hydration converged onto the SAME
    // component instead of remounting it.
    expect(setups).toBe(1)
  })

  it('keeps a user edit made before hydration, and persists it', async () => {
    const backend = deferredProvider({ width: 320 })
    setProvider(backend.provider)

    const result = root(() => useStoragePreference<number>('width', { defaultValue: 280 }))
    expect(result.value()).toBe(280)

    // The user drags the sidebar before the (slow) backend answers.
    result.setValue(360)
    expect(result.value()).toBe(360)

    // The stale snapshot: 320.
    backend.resolveHydration()
    await settle()

    expect(result.value()).toBe(360)
    expect(backend.values.get('width')).toBe(360)
  })

  it('applies live changes after hydration (another tab)', () => {
    const provider = syncProvider({ width: 320 })
    setProvider(provider)

    const result = root(() => useStoragePreference<number>('width', { defaultValue: 280 }))
    expect(result.value()).toBe(320)

    provider.remoteListeners.get('width')?.(400)

    expect(result.value()).toBe(400)
  })

  it('falls back to the default after removeValue', async () => {
    const provider = syncProvider({ width: 320 })
    setProvider(provider)

    const result = root(() => useStoragePreference<number>('width', { defaultValue: 280 }))

    result.removeValue()
    await settle()

    expect(result.value()).toBe(280)
    expect(provider.values.has('width')).toBe(false)
  })

  it('supports a functional update', () => {
    setProvider(syncProvider({ width: 320 }))

    const result = root(() => useStoragePreference<number>('width', { defaultValue: 280 }))

    result.setValue((previous) => (previous ?? 280) + 20)

    expect(result.value()).toBe(340)
  })

  it('persists nothing when the key is null, and reports ready immediately', () => {
    const provider = syncProvider()
    const set = vi.spyOn(provider, 'set')
    setProvider(provider)

    const result = root(() => useStoragePreference<string>(null, { defaultValue: 'none' }))

    result.setValue('typed')

    expect(result.value()).toBe('typed')
    expect(result.ready()).toBe(true)
    expect(set).not.toHaveBeenCalled()
  })
})
