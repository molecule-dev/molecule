// @vitest-environment jsdom
import { flushSync, mount, unmount } from 'svelte'
import { get, type Readable } from 'svelte/store'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getTestsBarVisible,
  setTestsBarVisible,
  TESTS_BAR_EVENT,
  TESTS_BAR_STORAGE_KEY,
} from '@molecule/app-ide-panel-logic/panels'

const { useTestsBarVisible } = await import('../hooks/useTestsBarVisible.js')
const { default: HookProbe } = await import('./HookProbe.svelte')

/**
 * A working in-memory Storage (Node's experimental web-storage shadows jsdom's).
 *
 * @returns A fresh Storage.
 */
function makeStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length() {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (key) => store.get(key) ?? null,
    key: (index) => Array.from(store.keys())[index] ?? null,
    removeItem: (key) => void store.delete(key),
    setItem: (key, value) => void store.set(key, String(value)),
  }
}

/** The mounted probes; torn down after every test, like React's roots. */
const instances: Array<Record<string, unknown>> = []

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: makeStorage(),
    configurable: true,
    writable: true,
  })
})
afterEach(async () => {
  for (const instance of instances.splice(0)) await unmount(instance)
  vi.restoreAllMocks()
})

/**
 * Mounts a component whose init calls one hook, the way an app does.
 *
 * @param call - The init body.
 * @returns The mounted probe (also tracked in `instances`).
 */
function mountProbe(call: () => void): Record<string, unknown> {
  const instance: Record<string, unknown> = mount(HookProbe, {
    target: document.createElement('div'),
    props: { call },
  })
  instances.push(instance)
  flushSync()
  return instance
}

describe('useTestsBarVisible', () => {
  it('defaults to visible when nothing is stored', () => {
    let visible: Readable<boolean> | undefined
    mountProbe(() => {
      visible = useTestsBarVisible()
    })
    expect(get(visible!)).toBe(true)
    expect(getTestsBarVisible()).toBe(true)
    expect(localStorage.getItem(TESTS_BAR_STORAGE_KEY)).toBeNull()
  })

  it('reads a stored false at mount', () => {
    localStorage.setItem(TESTS_BAR_STORAGE_KEY, 'false')
    let visible: Readable<boolean> | undefined
    mountProbe(() => {
      visible = useTestsBarVisible()
    })
    expect(get(visible!)).toBe(false)
    expect(getTestsBarVisible()).toBe(false)
  })

  it('follows setTestsBarVisible(false) and back to true', () => {
    let visible: Readable<boolean> | undefined
    mountProbe(() => {
      visible = useTestsBarVisible()
    })
    expect(get(visible!)).toBe(true)

    setTestsBarVisible(false)
    expect(get(visible!)).toBe(false)
    expect(localStorage.getItem(TESTS_BAR_STORAGE_KEY)).toBe('false')

    setTestsBarVisible(true)
    expect(get(visible!)).toBe(true)
    expect(getTestsBarVisible()).toBe(true)
  })

  it('re-reads on a storage event for its key and ignores other keys', () => {
    let visible: Readable<boolean> | undefined
    mountProbe(() => {
      visible = useTestsBarVisible()
    })
    expect(get(visible!)).toBe(true)

    localStorage.setItem(TESTS_BAR_STORAGE_KEY, 'false')
    window.dispatchEvent(new StorageEvent('storage', { key: 'mol_other_setting' }))
    expect(get(visible!)).toBe(true)

    window.dispatchEvent(new StorageEvent('storage', { key: TESTS_BAR_STORAGE_KEY }))
    expect(get(visible!)).toBe(false)
  })

  it('removes both listeners at unmount and ignores events afterwards', async () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    let visible: Readable<boolean> | undefined
    const instance = mountProbe(() => {
      visible = useTestsBarVisible()
    })
    const testsListener = addSpy.mock.calls.find(([type]) => type === TESTS_BAR_EVENT)?.[1]
    const storageListener = addSpy.mock.calls.find(([type]) => type === 'storage')?.[1]

    setTestsBarVisible(false)
    expect(get(visible!)).toBe(false)

    // Taken off the shared teardown list first, so the unmount below is the
    // only one this probe ever sees.
    instances.splice(instances.indexOf(instance), 1)
    await unmount(instance)
    expect(removeSpy).toHaveBeenCalledWith(TESTS_BAR_EVENT, testsListener)
    expect(removeSpy).toHaveBeenCalledWith('storage', storageListener)

    localStorage.setItem(TESTS_BAR_STORAGE_KEY, 'true')
    window.dispatchEvent(new Event(TESTS_BAR_EVENT))
    window.dispatchEvent(new StorageEvent('storage', { key: TESTS_BAR_STORAGE_KEY }))
    expect(get(visible!)).toBe(false)
  })
})
