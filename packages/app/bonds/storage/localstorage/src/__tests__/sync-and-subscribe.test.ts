/**
 * Tests for the synchronous read (`getSync`) and external-change subscription
 * (`subscribe`) a localStorage-backed provider offers on top of the async
 * `StorageProvider` contract.
 *
 * These are what let `getPreferenceStore()` in `@molecule/app-storage` report a
 * persisted preference on the first render (a render cannot await) and react to
 * ANOTHER tab's write (the `storage` event never fires in the tab that wrote).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createLocalStorageProvider } from '../index.js'

/** A minimal synchronous `Storage`. */
function createMockStorage(): Storage & { values: Map<string, string> } {
  const values = new Map<string, string>()
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, String(value)),
    removeItem: (key: string) => void values.delete(key),
    clear: () => values.clear(),
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    get length() {
      return values.size
    },
  }
}

/** A window stand-in that only records `storage` listeners. */
function createWindowStub(): {
  listeners: Set<(event: StorageEvent) => void>
  addEventListener: (type: string, listener: (event: StorageEvent) => void) => void
  removeEventListener: (type: string, listener: (event: StorageEvent) => void) => void
} {
  const listeners = new Set<(event: StorageEvent) => void>()
  return {
    listeners,
    addEventListener: (type, listener) => {
      if (type === 'storage') listeners.add(listener)
    },
    removeEventListener: (type, listener) => {
      if (type === 'storage') listeners.delete(listener)
    },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getSync', () => {
  let storage: ReturnType<typeof createMockStorage>

  beforeEach(() => {
    storage = createMockStorage()
  })

  it('reads the stored value without awaiting', () => {
    const provider = createLocalStorageProvider({ storage })
    storage.setItem('width', '240')

    expect(provider.getSync!<number>('width')).toBe(240)
  })

  it('returns null for an absent key', () => {
    const provider = createLocalStorageProvider({ storage })

    expect(provider.getSync!('missing')).toBeNull()
  })

  it('honors the key prefix', () => {
    const provider = createLocalStorageProvider({ storage, prefix: 'app_' })
    storage.setItem('app_width', '320')

    expect(provider.getSync!<number>('width')).toBe(320)
    expect(storage.getItem('app_width')).toBe('320')
  })

  it('reads a corrupt entry as absent instead of throwing', () => {
    const provider = createLocalStorageProvider({ storage })
    storage.setItem('broken', 'not valid json{{{')

    expect(provider.getSync!('broken')).toBeNull()
  })

  it('falls back to the in-memory store when the backend is unavailable', async () => {
    const provider = createLocalStorageProvider({ storage: undefined })
    await provider.set('key', 'value')

    expect(provider.getSync!<string>('key')).toBe('value')
  })
})

describe('subscribe', () => {
  let storage: ReturnType<typeof createMockStorage>
  let windowStub: ReturnType<typeof createWindowStub>

  beforeEach(() => {
    storage = createMockStorage()
    windowStub = createWindowStub()
    vi.stubGlobal('window', windowStub)
  })

  /** Dispatches the `storage` event a browser fires in OTHER tabs. */
  const emitStorage = (event: Partial<StorageEvent>): void => {
    for (const listener of windowStub.listeners) listener(event as StorageEvent)
  }

  it('notifies with the deserialized new value for its own key', () => {
    const provider = createLocalStorageProvider({ storage })
    const listener = vi.fn()
    provider.subscribe!('advanced', listener)

    emitStorage({ key: 'advanced', newValue: 'true' })

    expect(listener).toHaveBeenCalledWith(true)
  })

  it('ignores a change to another key', () => {
    const provider = createLocalStorageProvider({ storage })
    const listener = vi.fn()
    provider.subscribe!('advanced', listener)

    emitStorage({ key: 'something-else', newValue: '1' })

    expect(listener).not.toHaveBeenCalled()
  })

  it('matches the prefixed key it stores under', () => {
    const provider = createLocalStorageProvider({ storage, prefix: 'app_' })
    const listener = vi.fn()
    provider.subscribe!('advanced', listener)

    emitStorage({ key: 'advanced', newValue: 'true' })
    expect(listener).not.toHaveBeenCalled()

    emitStorage({ key: 'app_advanced', newValue: 'true' })
    expect(listener).toHaveBeenCalledWith(true)
  })

  it('reports a removal (and another tab clearing storage) as null', () => {
    const provider = createLocalStorageProvider({ storage })
    const listener = vi.fn()
    provider.subscribe!('advanced', listener)

    emitStorage({ key: 'advanced', newValue: null })
    emitStorage({ key: null, newValue: null })

    expect(listener).toHaveBeenNthCalledWith(1, null)
    expect(listener).toHaveBeenNthCalledWith(2, null)
  })

  it('reports an unparseable value as null', () => {
    const provider = createLocalStorageProvider({ storage })
    const listener = vi.fn()
    provider.subscribe!('advanced', listener)

    emitStorage({ key: 'advanced', newValue: 'not json{{' })

    expect(listener).toHaveBeenCalledWith(null)
  })

  it('ignores an event from a different storage backend', () => {
    const provider = createLocalStorageProvider({ storage })
    const listener = vi.fn()
    provider.subscribe!('advanced', listener)

    emitStorage({ key: 'advanced', newValue: 'true', storageArea: createMockStorage() })

    expect(listener).not.toHaveBeenCalled()
  })

  it('stops listening when unsubscribed', () => {
    const provider = createLocalStorageProvider({ storage })
    const listener = vi.fn()
    const stop = provider.subscribe!('advanced', listener)
    expect(windowStub.listeners.size).toBe(1)

    stop()
    emitStorage({ key: 'advanced', newValue: 'true' })

    expect(windowStub.listeners.size).toBe(0)
    expect(listener).not.toHaveBeenCalled()
  })

  it('returns a no-op unsubscribe with no window (SSR)', () => {
    vi.unstubAllGlobals()
    const provider = createLocalStorageProvider({ storage })
    const stop = provider.subscribe!('advanced', vi.fn())

    expect(() => stop()).not.toThrow()
  })
})
