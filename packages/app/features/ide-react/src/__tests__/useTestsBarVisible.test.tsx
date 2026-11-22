// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getTestsBarVisible,
  setTestsBarVisible,
  TESTS_BAR_EVENT,
  TESTS_BAR_STORAGE_KEY,
} from '@molecule/app-ide-panel-logic/panels'

import { useTestsBarVisible } from '../hooks/useTestsBarVisible.js'

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

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: makeStorage(),
    configurable: true,
    writable: true,
  })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('useTestsBarVisible', () => {
  it('defaults to visible when nothing is stored', () => {
    const { result } = renderHook(() => useTestsBarVisible())
    expect(result.current).toBe(true)
    expect(getTestsBarVisible()).toBe(true)
    expect(localStorage.getItem(TESTS_BAR_STORAGE_KEY)).toBeNull()
  })

  it('reads a stored false at mount', () => {
    localStorage.setItem(TESTS_BAR_STORAGE_KEY, 'false')
    const { result } = renderHook(() => useTestsBarVisible())
    expect(result.current).toBe(false)
    expect(getTestsBarVisible()).toBe(false)
  })

  it('follows setTestsBarVisible(false) and back to true', () => {
    const { result } = renderHook(() => useTestsBarVisible())
    expect(result.current).toBe(true)

    act(() => setTestsBarVisible(false))
    expect(result.current).toBe(false)
    expect(localStorage.getItem(TESTS_BAR_STORAGE_KEY)).toBe('false')

    act(() => setTestsBarVisible(true))
    expect(result.current).toBe(true)
    expect(getTestsBarVisible()).toBe(true)
  })

  it('re-reads on a storage event for its key and ignores other keys', () => {
    const { result } = renderHook(() => useTestsBarVisible())
    expect(result.current).toBe(true)

    localStorage.setItem(TESTS_BAR_STORAGE_KEY, 'false')
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'mol_other_setting' }))
    })
    expect(result.current).toBe(true)

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: TESTS_BAR_STORAGE_KEY }))
    })
    expect(result.current).toBe(false)
  })

  it('removes both listeners at unmount and ignores events afterwards', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')
    const { result, unmount } = renderHook(() => useTestsBarVisible())
    const testsListener = addSpy.mock.calls.find(([type]) => type === TESTS_BAR_EVENT)?.[1]
    const storageListener = addSpy.mock.calls.find(([type]) => type === 'storage')?.[1]

    act(() => setTestsBarVisible(false))
    expect(result.current).toBe(false)

    unmount()
    expect(removeSpy).toHaveBeenCalledWith(TESTS_BAR_EVENT, testsListener)
    expect(removeSpy).toHaveBeenCalledWith('storage', storageListener)

    localStorage.setItem(TESTS_BAR_STORAGE_KEY, 'true')
    window.dispatchEvent(new Event(TESTS_BAR_EVENT))
    window.dispatchEvent(new StorageEvent('storage', { key: TESTS_BAR_STORAGE_KEY }))
    expect(result.current).toBe(false)
  })
})
