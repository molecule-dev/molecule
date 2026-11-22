// @vitest-environment jsdom
import '@angular/compiler'
import {
  Component,
  createComponent,
  provideZonelessChangeDetection,
  type Signal,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
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

/** A mounted hook host; destroyed after every test, like React's roots. */
interface HookMount {
  /** Tears the host down (its `DestroyRef` cleanup runs, like an unmount). */
  destroy: () => Promise<void>
}

/** Host selectors minted so far (each mount defines its own component). */
let hostCount = 0

/** The mounts this file created; destroyed after every test, like React's roots. */
const mounts: HookMount[] = []

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: makeStorage(),
    configurable: true,
    writable: true,
  })
})
afterEach(async () => {
  for (const mount of mounts.splice(0)) await mount.destroy()
  vi.restoreAllMocks()
})

/**
 * Calls one function in an injection context, inside a real zoneless Angular
 * application, the way an app calls the hook.
 *
 * @param call - The hook call (a field-initializer expression).
 * @returns The mount.
 */
async function mountHook(call: () => void): Promise<HookMount> {
  const appRef = await createApplication({ providers: [provideZonelessChangeDetection()] })
  const Host = Component({
    selector: `mol-hook-host-${++hostCount}`,
    standalone: true,
    template: '',
  })(
    class HookHost {
      // A field initializer runs in the component's injection context.
      readonly result = call()
    },
  )
  const ref = createComponent(Host as Type<{ result: void }>, {
    environmentInjector: appRef.injector,
  })
  document.body.appendChild(ref.location.nativeElement)
  appRef.attachView(ref.hostView)
  return {
    destroy: async () => {
      appRef.destroy()
      ref.location.nativeElement.remove()
    },
  }
}

describe('useTestsBarVisible', () => {
  it('defaults to visible when nothing is stored', async () => {
    let visible: Signal<boolean> | undefined
    const mount = await mountHook(() => {
      visible = useTestsBarVisible()
    })
    mounts.push(mount)
    expect(visible!()).toBe(true)
    expect(getTestsBarVisible()).toBe(true)
    expect(localStorage.getItem(TESTS_BAR_STORAGE_KEY)).toBeNull()
  })

  it('reads a stored false at mount', async () => {
    localStorage.setItem(TESTS_BAR_STORAGE_KEY, 'false')
    let visible: Signal<boolean> | undefined
    const mount = await mountHook(() => {
      visible = useTestsBarVisible()
    })
    mounts.push(mount)
    expect(visible!()).toBe(false)
    expect(getTestsBarVisible()).toBe(false)
  })

  it('follows setTestsBarVisible(false) and back to true', async () => {
    let visible: Signal<boolean> | undefined
    const mount = await mountHook(() => {
      visible = useTestsBarVisible()
    })
    mounts.push(mount)
    expect(visible!()).toBe(true)

    setTestsBarVisible(false)
    expect(visible!()).toBe(false)
    expect(localStorage.getItem(TESTS_BAR_STORAGE_KEY)).toBe('false')

    setTestsBarVisible(true)
    expect(visible!()).toBe(true)
    expect(getTestsBarVisible()).toBe(true)
  })

  it('re-reads on a storage event for its key and ignores other keys', async () => {
    let visible: Signal<boolean> | undefined
    const mount = await mountHook(() => {
      visible = useTestsBarVisible()
    })
    mounts.push(mount)
    expect(visible!()).toBe(true)

    localStorage.setItem(TESTS_BAR_STORAGE_KEY, 'false')
    window.dispatchEvent(new StorageEvent('storage', { key: 'mol_other_setting' }))
    expect(visible!()).toBe(true)

    window.dispatchEvent(new StorageEvent('storage', { key: TESTS_BAR_STORAGE_KEY }))
    expect(visible!()).toBe(false)
  })

  it('removes both listeners at unmount and ignores events afterwards', async () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    let visible: Signal<boolean> | undefined
    // Not pushed to `mounts`, so the destroy below is the only teardown this
    // host ever sees.
    const mount = await mountHook(() => {
      visible = useTestsBarVisible()
    })
    const testsListener = addSpy.mock.calls.find(([type]) => type === TESTS_BAR_EVENT)?.[1]
    const storageListener = addSpy.mock.calls.find(([type]) => type === 'storage')?.[1]

    setTestsBarVisible(false)
    expect(visible!()).toBe(false)

    await mount.destroy()
    expect(removeSpy).toHaveBeenCalledWith(TESTS_BAR_EVENT, testsListener)
    expect(removeSpy).toHaveBeenCalledWith('storage', storageListener)

    localStorage.setItem(TESTS_BAR_STORAGE_KEY, 'true')
    window.dispatchEvent(new Event(TESTS_BAR_EVENT))
    window.dispatchEvent(new StorageEvent('storage', { key: TESTS_BAR_STORAGE_KEY }))
    expect(visible!()).toBe(false)
  })
})
