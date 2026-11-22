// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type App, createApp, defineComponent, h, nextTick, type Ref } from 'vue'

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

/** The apps this file mounted; unmounted after every test, like React's roots. */
const apps: App[] = []

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: makeStorage(),
    configurable: true,
    writable: true,
  })
})
afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  vi.restoreAllMocks()
})

/**
 * Mounts a component whose setup calls one hook, the way an app does.
 *
 * @param setup - The setup body.
 * @returns The mounted app.
 */
function mountSetup(setup: () => void): App {
  const app = createApp(defineComponent({ setup, render: () => h('div') }))
  apps.push(app)
  app.mount(document.createElement('div'))
  return app
}

describe('useTestsBarVisible', () => {
  it('defaults to visible when nothing is stored', () => {
    let visible: Ref<boolean> | undefined
    mountSetup(() => {
      visible = useTestsBarVisible()
    })
    expect(visible!.value).toBe(true)
    expect(getTestsBarVisible()).toBe(true)
    expect(localStorage.getItem(TESTS_BAR_STORAGE_KEY)).toBeNull()
  })

  it('reads a stored false at mount', () => {
    localStorage.setItem(TESTS_BAR_STORAGE_KEY, 'false')
    let visible: Ref<boolean> | undefined
    mountSetup(() => {
      visible = useTestsBarVisible()
    })
    expect(visible!.value).toBe(false)
    expect(getTestsBarVisible()).toBe(false)
  })

  it('follows setTestsBarVisible(false) and back to true', async () => {
    let visible: Ref<boolean> | undefined
    mountSetup(() => {
      visible = useTestsBarVisible()
    })
    expect(visible!.value).toBe(true)

    setTestsBarVisible(false)
    await nextTick()
    expect(visible!.value).toBe(false)
    expect(localStorage.getItem(TESTS_BAR_STORAGE_KEY)).toBe('false')

    setTestsBarVisible(true)
    await nextTick()
    expect(visible!.value).toBe(true)
    expect(getTestsBarVisible()).toBe(true)
  })

  it('re-reads on a storage event for its key and ignores other keys', async () => {
    let visible: Ref<boolean> | undefined
    mountSetup(() => {
      visible = useTestsBarVisible()
    })
    expect(visible!.value).toBe(true)

    localStorage.setItem(TESTS_BAR_STORAGE_KEY, 'false')
    window.dispatchEvent(new StorageEvent('storage', { key: 'mol_other_setting' }))
    await nextTick()
    expect(visible!.value).toBe(true)

    window.dispatchEvent(new StorageEvent('storage', { key: TESTS_BAR_STORAGE_KEY }))
    await nextTick()
    expect(visible!.value).toBe(false)
  })

  it('removes both listeners at unmount and ignores events afterwards', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    let visible: Ref<boolean> | undefined
    // Mounted (and unmounted) here, outside `apps`, so the cleanup below is the
    // only unmount this app ever sees.
    const app = createApp(
      defineComponent({
        setup: () => {
          visible = useTestsBarVisible()
        },
        render: () => h('div'),
      }),
    )
    app.mount(document.createElement('div'))
    const testsListener = addSpy.mock.calls.find(([type]) => type === TESTS_BAR_EVENT)?.[1]
    const storageListener = addSpy.mock.calls.find(([type]) => type === 'storage')?.[1]

    setTestsBarVisible(false)
    expect(visible!.value).toBe(false)

    app.unmount()
    expect(removeSpy).toHaveBeenCalledWith(TESTS_BAR_EVENT, testsListener)
    expect(removeSpy).toHaveBeenCalledWith('storage', storageListener)

    localStorage.setItem(TESTS_BAR_STORAGE_KEY, 'true')
    window.dispatchEvent(new Event(TESTS_BAR_EVENT))
    window.dispatchEvent(new StorageEvent('storage', { key: TESTS_BAR_STORAGE_KEY }))
    expect(visible!.value).toBe(false)
  })
})
