/**
 * `useStorageValue` keeps `loading` and `value` true to the key it was given:
 * a write that lands before the first read still ends the loading state, a new
 * key starts over, and an object `defaultValue` does not re-read on every render.
 *
 * @module
 */

import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { StorageProvider as StorageProviderType } from '@molecule/app-storage'

import { useStorageValue } from '../hooks/index.js'
import { StorageProvider } from '../providers.js'

/**
 * A storage provider whose reads stay pending until the test answers them.
 *
 * @param contents - What a read answers with, per key.
 * @returns The provider, its read spy and a function that answers the oldest pending read.
 */
function heldStorage(contents: Record<string, unknown> = {}): {
  provider: StorageProviderType
  get: ReturnType<typeof vi.fn>
  answer: () => Promise<void>
} {
  const values = new Map(Object.entries(contents))
  const pending: Array<() => void> = []
  const get = vi.fn(
    (key: string) =>
      new Promise((resolve) => {
        pending.push(() => resolve(values.has(key) ? values.get(key) : null))
      }),
  )
  const provider = {
    get,
    set: vi.fn(async (key: string, value: unknown) => {
      values.set(key, value)
    }),
    remove: vi.fn(async (key: string) => {
      values.delete(key)
    }),
    clear: vi.fn(async () => values.clear()),
    keys: vi.fn(async () => [...values.keys()]),
  } as unknown as StorageProviderType
  const answer = async (): Promise<void> => {
    await act(async () => {
      pending.shift()?.()
    })
  }
  return { provider, get, answer }
}

const wrapperFor =
  (provider: StorageProviderType) =>
  ({ children }: { children: ReactNode }): React.JSX.Element => (
    <StorageProvider provider={provider}>{children}</StorageProvider>
  )

describe('useStorageValue', () => {
  it('ends loading when a write lands before the first read, keeping the written value', async () => {
    const storage = heldStorage({ theme: 'light' })
    const { result } = renderHook(() => useStorageValue<string>('theme', { defaultValue: 'x' }), {
      wrapper: wrapperFor(storage.provider),
    })
    expect(result.current.loading).toBe(true)

    await act(async () => {
      await result.current.setValue('dark')
    })
    await storage.answer()

    expect(result.current).toMatchObject({ value: 'dark', loading: false, error: null })
  })

  it('starts over when the key changes', async () => {
    const storage = heldStorage({ a: 'value of a', b: 'value of b' })
    const { result, rerender } = renderHook(
      ({ key }: { key: string }) => useStorageValue<string>(key, { defaultValue: 'default' }),
      { wrapper: wrapperFor(storage.provider), initialProps: { key: 'a' } },
    )
    await storage.answer()
    expect(result.current).toMatchObject({ value: 'value of a', loading: false })

    rerender({ key: 'b' })
    expect(result.current).toMatchObject({ value: 'default', loading: true })

    await storage.answer()
    expect(result.current).toMatchObject({ value: 'value of b', loading: false })
  })

  it('reads once for an object defaultValue written inline', async () => {
    const storage = heldStorage()
    const { result, rerender } = renderHook(
      () => useStorageValue<{ size: number }>('prefs', { defaultValue: { size: 1 } }),
      { wrapper: wrapperFor(storage.provider) },
    )
    await storage.answer()
    await waitFor(() => expect(result.current.loading).toBe(false))
    rerender()
    rerender()

    expect(result.current.value).toEqual({ size: 1 })
    expect(storage.get).toHaveBeenCalledTimes(1)
  })
})
