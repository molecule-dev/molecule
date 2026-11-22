// @vitest-environment jsdom
import type { Accessor, JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getTestsBarVisible,
  setTestsBarVisible,
  TESTS_BAR_EVENT,
  TESTS_BAR_STORAGE_KEY,
} from '@molecule/app-ide-panel-logic/panels'

const { useTestsBarVisible } = await import('../hooks/useTestsBarVisible.js')

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

/** The roots this file mounted; disposed after every test, like React's roots. */
const disposers: Array<() => void> = []

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: makeStorage(),
    configurable: true,
    writable: true,
  })
})
afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  vi.restoreAllMocks()
})

/**
 * Mounts a component whose body calls one hook, the way an app does.
 *
 * @param setup - The component body.
 */
function mountProbe(setup: () => void): void {
  function Probe(): JSX.Element {
    setup()
    return <></>
  }
  const container = document.createElement('div')
  disposers.push(render(() => <Probe />, container))
}

describe('useTestsBarVisible', () => {
  it('defaults to visible when nothing is stored', () => {
    let visible: Accessor<boolean> | undefined
    mountProbe(() => {
      visible = useTestsBarVisible()
    })
    expect(visible!()).toBe(true)
    expect(getTestsBarVisible()).toBe(true)
    expect(localStorage.getItem(TESTS_BAR_STORAGE_KEY)).toBeNull()
  })

  it('reads a stored false at mount', () => {
    localStorage.setItem(TESTS_BAR_STORAGE_KEY, 'false')
    let visible: Accessor<boolean> | undefined
    mountProbe(() => {
      visible = useTestsBarVisible()
    })
    expect(visible!()).toBe(false)
    expect(getTestsBarVisible()).toBe(false)
  })

  it('follows setTestsBarVisible(false) and back to true', () => {
    let visible: Accessor<boolean> | undefined
    mountProbe(() => {
      visible = useTestsBarVisible()
    })
    expect(visible!()).toBe(true)

    setTestsBarVisible(false)
    expect(visible!()).toBe(false)
    expect(localStorage.getItem(TESTS_BAR_STORAGE_KEY)).toBe('false')

    setTestsBarVisible(true)
    expect(visible!()).toBe(true)
    expect(getTestsBarVisible()).toBe(true)
  })

  it('re-reads on a storage event for its key and ignores other keys', () => {
    let visible: Accessor<boolean> | undefined
    mountProbe(() => {
      visible = useTestsBarVisible()
    })
    expect(visible!()).toBe(true)

    localStorage.setItem(TESTS_BAR_STORAGE_KEY, 'false')
    window.dispatchEvent(new StorageEvent('storage', { key: 'mol_other_setting' }))
    expect(visible!()).toBe(true)

    window.dispatchEvent(new StorageEvent('storage', { key: TESTS_BAR_STORAGE_KEY }))
    expect(visible!()).toBe(false)
  })

  it('removes both listeners at unmount and ignores events afterwards', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    let visible: Accessor<boolean> | undefined
    function Probe(): JSX.Element {
      visible = useTestsBarVisible()
      return <></>
    }
    // Rendered (and disposed) here, outside `disposers`, so the dispose below
    // is the only teardown this root ever sees.
    const container = document.createElement('div')
    const dispose = render(() => <Probe />, container)
    const testsListener = addSpy.mock.calls.find(([type]) => type === TESTS_BAR_EVENT)?.[1]
    const storageListener = addSpy.mock.calls.find(([type]) => type === 'storage')?.[1]

    setTestsBarVisible(false)
    expect(visible!()).toBe(false)

    dispose()
    expect(removeSpy).toHaveBeenCalledWith(TESTS_BAR_EVENT, testsListener)
    expect(removeSpy).toHaveBeenCalledWith('storage', storageListener)

    localStorage.setItem(TESTS_BAR_STORAGE_KEY, 'true')
    window.dispatchEvent(new Event(TESTS_BAR_EVENT))
    window.dispatchEvent(new StorageEvent('storage', { key: TESTS_BAR_STORAGE_KEY }))
    expect(visible!()).toBe(false)
  })
})
