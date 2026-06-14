import { afterEach, describe, expect, it, vi } from 'vitest'

import { getBrowserStorage } from '../browser-storage.js'
import { createProvider } from '../provider.js'

/** A minimal in-memory stand-in for the browser `localStorage` API. */
function fakeLocalStorage(): Storage & { _store: Map<string, string> } {
  const store = new Map<string, string>()
  return {
    _store: store,
    get length() {
      return store.size
    },
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v)
    },
    removeItem: (k: string) => {
      store.delete(k)
    },
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getBrowserStorage', () => {
  it('returns null when no localStorage exists (SSR / Node)', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(getBrowserStorage()).toBeNull()
  })

  it('returns null when localStorage access throws (private mode)', () => {
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new Error('blocked')
      },
      getItem: () => null,
      removeItem: () => {},
    })
    expect(getBrowserStorage()).toBeNull()
  })

  it('returns a working adapter that round-trips through localStorage', () => {
    const ls = fakeLocalStorage()
    vi.stubGlobal('localStorage', ls)

    const adapter = getBrowserStorage()
    expect(adapter).not.toBeNull()
    // The probe key must be cleaned up — only real writes should remain.
    expect(ls._store.size).toBe(0)

    adapter?.setItem('k', 'v')
    expect(adapter?.getItem('k')).toBe('v')
    expect(ls._store.get('k')).toBe('v')

    adapter?.removeItem('k')
    expect(adapter?.getItem('k')).toBeNull()
  })

  it('persists a resize across a reload (new provider restores the saved width)', () => {
    const ls = fakeLocalStorage()
    vi.stubGlobal('localStorage', ls)
    const adapter = getBrowserStorage()
    expect(adapter).not.toBeNull()

    // Session 1: user drags the chat divider to 40%.
    const first = createProvider({ persistLayout: true, storage: adapter ?? undefined })
    first.resizePanel('chat', 40)
    expect(ls._store.size).toBeGreaterThan(0)

    // Session 2 (a reload): a brand-new provider reading the same storage must
    // restore the chosen width rather than snapping back to the 25% default.
    const second = createProvider({ persistLayout: true, storage: adapter ?? undefined })
    expect(second.getLayout().sizes.left[0]).toBe(40)
  })
})
