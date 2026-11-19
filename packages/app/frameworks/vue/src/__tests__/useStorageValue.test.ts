// @vitest-environment jsdom
/**
 * `useStorageValue` keeps `loading` and `value` true to the key it was given:
 * a write that lands before the first read still ends the loading state, a new
 * key starts over, and an object `defaultValue` does not re-read on every
 * render.
 *
 * The React cases render a hook with a provider wrapper; a Vue composable is
 * injected through `moleculePlugin` and runs inside a mounted component, so a
 * `Probe` component does the same job.
 *
 * @module
 */

import { mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, type Mock, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'

import type { StorageProvider } from '@molecule/app-storage'

import { useStorageValue, type UseStorageValueOptions } from '../composables/useStorage.js'
import { moleculePlugin } from '../plugin.js'
import type { UseStorageValueReturn } from '../types.js'

/**
 * A storage provider whose reads stay pending until the test answers them.
 *
 * @param contents - What a read answers with, per key.
 * @returns The provider, its read spy and a function that answers the oldest pending read.
 */
function heldStorage(contents: Record<string, unknown> = {}): {
  provider: StorageProvider
  get: Mock<(key: string) => Promise<unknown>>
  answer: () => Promise<void>
} {
  const values = new Map(Object.entries(contents))
  const pending: Array<() => void> = []
  const get = vi.fn<(key: string) => Promise<unknown>>(
    (key) =>
      new Promise((resolve) => {
        pending.push(() => resolve(values.has(key) ? values.get(key) : null))
      }),
  )
  const provider: StorageProvider = {
    get: <T = unknown>(key: string): Promise<T | null> => get(key) as Promise<T | null>,
    set: vi.fn(async (key: string, value: unknown) => {
      values.set(key, value)
    }),
    remove: vi.fn(async (key: string) => {
      values.delete(key)
    }),
    clear: vi.fn(async () => {
      values.clear()
    }),
    keys: vi.fn(async () => [...values.keys()]),
  }
  const answer = async (): Promise<void> => {
    pending.shift()?.()
    await nextTick()
  }
  return { provider, get, answer }
}

const wrappers: VueWrapper[] = []

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount()
})

/**
 * Runs the composable inside a mounted component and returns it.
 *
 * @param key - The storage key.
 * @param options - The composable options.
 * @param provider - The storage provider the plugin injects.
 * @returns The composable result.
 */
function runStorageValue<T>(
  key: string,
  options: UseStorageValueOptions<T> | (() => UseStorageValueOptions<T>),
  provider: StorageProvider,
): UseStorageValueReturn<T> {
  let captured: UseStorageValueReturn<T> | null = null
  const Probe = defineComponent({
    setup() {
      captured = useStorageValue<T>(key, options)
      return () => h('div')
    },
  })
  const wrapper = mount(Probe, {
    global: { plugins: [[moleculePlugin, { storage: provider }]] },
  })
  wrappers.push(wrapper)
  if (!captured) throw new Error('useStorageValue setup did not run')
  return captured
}

describe('useStorageValue', () => {
  it('ends loading when a write lands before the first read, keeping the written value', async () => {
    const storage = heldStorage({ theme: 'light' })
    const result = runStorageValue<string>('theme', { defaultValue: 'x' }, storage.provider)
    expect(result.loading.value).toBe(true)

    await result.setValue('dark')
    await storage.answer()

    expect({
      value: result.value.value,
      loading: result.loading.value,
      error: result.error.value,
    }).toMatchObject({ value: 'dark', loading: false, error: null })
  })

  it('starts over when the key changes', async () => {
    const storage = heldStorage({ a: 'value of a', b: 'value of b' })
    const key = ref('a')
    let result!: UseStorageValueReturn<string>
    const Probe = defineComponent({
      setup() {
        result = useStorageValue<string>(key, { defaultValue: 'default' })
        return () => h('div')
      },
    })
    const wrapper = mount(Probe, {
      global: { plugins: [[moleculePlugin, { storage: storage.provider }]] },
    })
    wrappers.push(wrapper)

    await storage.answer()
    expect({
      value: result.value.value,
      loading: result.loading.value,
    }).toMatchObject({ value: 'value of a', loading: false })

    key.value = 'b'
    await nextTick()
    expect({
      value: result.value.value,
      loading: result.loading.value,
    }).toMatchObject({ value: 'default', loading: true })

    await storage.answer()
    expect({
      value: result.value.value,
      loading: result.loading.value,
    }).toMatchObject({ value: 'value of b', loading: false })
  })

  it('reads once for an object defaultValue written inline', async () => {
    const storage = heldStorage()
    const tick = ref(0)
    let result!: UseStorageValueReturn<{ size: number }>
    const Probe = defineComponent({
      setup() {
        // A getter returns a fresh options object on every read, like React's
        // inline `{ defaultValue: { size: 1 } }` on every render.
        result = useStorageValue<{ size: number }>('prefs', () => ({
          defaultValue: { size: 1 },
        }))
        return () => {
          void tick.value
          return h('div')
        }
      },
    })
    const wrapper = mount(Probe, {
      global: { plugins: [[moleculePlugin, { storage: storage.provider }]] },
    })
    wrappers.push(wrapper)

    await storage.answer()
    await vi.waitFor(() => expect(result.loading.value).toBe(false))
    tick.value += 1
    await nextTick()
    tick.value += 1
    await nextTick()

    expect(result.value.value).toEqual({ size: 1 })
    expect(storage.get).toHaveBeenCalledTimes(1)
  })
})
