// @vitest-environment jsdom

/**
 * `useStorageValue` keeps `loading` and `value` true to the key it was given:
 * a write that lands before the first read still ends the loading state, a new
 * key starts over, and an object `defaultValue` does not re-read — React's
 * cases in Svelte's idiom, where the hook takes the key and options as plain
 * values or readable stores.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { get, writable } from 'svelte/store'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Host from '@molecule/app-framework-conformance/adapters/svelte-bindings/Host.svelte'
import type { StorageProvider } from '@molecule/app-storage'

import { setMoleculeContext } from '../context.js'
import { useStorageValue } from '../hooks/useStorage.js'

/**
 * A storage provider whose reads stay pending until the test answers them.
 *
 * @param contents - What a read answers with, per key.
 * @returns The provider, the keys it read and a function that answers the oldest pending read.
 */
function heldStorage(contents: Record<string, unknown> = {}): {
  provider: StorageProvider
  getCalls: string[]
  answer: () => Promise<void>
} {
  const values = new Map(Object.entries(contents))
  const pending: Array<() => void> = []
  const getCalls: string[] = []
  const provider: StorageProvider = {
    get<T = unknown>(key: string): Promise<T | null> {
      getCalls.push(key)
      return new Promise<T | null>((resolve) => {
        pending.push(() => resolve((values.has(key) ? values.get(key) : null) as T | null))
      })
    },
    set: vi.fn(async (key: string, value: unknown): Promise<void> => {
      values.set(key, value)
    }),
    remove: vi.fn(async (key: string): Promise<void> => {
      values.delete(key)
    }),
    clear: vi.fn(async (): Promise<void> => {
      values.clear()
    }),
    keys: vi.fn(async (): Promise<string[]> => [...values.keys()]),
  }
  const answer = async (): Promise<void> => {
    pending.shift()?.()
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
  return { provider, getCalls, answer }
}

/** The mounted hosts this file tears down after each case. */
const hosts: Array<() => Promise<void>> = []

/**
 * Mounts a host that runs a hook during a child's init under a storage
 * context, and returns what the hook returned.
 *
 * @param provider - The storage provider the context carries.
 * @param run - Calls the hook; its return value is kept.
 * @returns The hook's result and the host's unmount.
 */
function mountStorage<T>(
  provider: StorageProvider,
  run: () => T,
): { result: T; stop: () => Promise<void> } {
  const captured: { result?: T } = {}
  const container = document.createElement('div')
  document.body.appendChild(container)
  const app = mount(Host, {
    target: container,
    props: {
      config: { storage: provider },
      setMoleculeContext,
      run: () => {
        captured.result = run()
      },
    },
  })
  flushSync()
  const stop = async (): Promise<void> => {
    await unmount(app)
    container.remove()
  }
  hosts.push(stop)
  if (captured.result === undefined) throw new Error('the host never ran the hook')
  return { result: captured.result, stop }
}

afterEach(async () => {
  for (const stop of hosts.splice(0)) await stop()
})

describe('useStorageValue', () => {
  it('ends loading when a write lands before the first read, keeping the written value', async () => {
    const storage = heldStorage({ theme: 'light' })
    const { result } = mountStorage(storage.provider, () =>
      useStorageValue<string>('theme', { defaultValue: 'x' }),
    )
    expect(get(result.loading)).toBe(true)

    await result.setValue('dark')
    await storage.answer()

    expect(get(result.value)).toBe('dark')
    expect(get(result.loading)).toBe(false)
    expect(get(result.error)).toBeNull()
  })

  it('starts over when the key changes', async () => {
    const storage = heldStorage({ a: 'value of a', b: 'value of b' })
    const key = writable('a')
    const { result } = mountStorage(storage.provider, () =>
      useStorageValue<string>(key, { defaultValue: 'default' }),
    )
    await storage.answer()
    expect(get(result.value)).toBe('value of a')
    expect(get(result.loading)).toBe(false)

    key.set('b')
    expect(get(result.value)).toBe('default')
    expect(get(result.loading)).toBe(true)

    await storage.answer()
    expect(get(result.value)).toBe('value of b')
    expect(get(result.loading)).toBe(false)
  })

  it('reads once for an object defaultValue written inline', async () => {
    const storage = heldStorage()
    const options = writable({ defaultValue: { size: 1 } })
    const { result } = mountStorage(storage.provider, () =>
      useStorageValue<{ size: number }>('prefs', options),
    )
    await storage.answer()
    await vi.waitFor(() => expect(get(result.loading)).toBe(false))
    // A fresh options object on each read is the inline literal's shape.
    options.set({ defaultValue: { size: 1 } })
    options.set({ defaultValue: { size: 1 } })

    expect(get(result.value)).toEqual({ size: 1 })
    expect(storage.getCalls).toHaveLength(1)
  })
})
