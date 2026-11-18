// @vitest-environment jsdom

/**
 * Setters must compose when called several times in one tick: each computes
 * the next value from the latest state, not from the last committed render.
 * The hook keeps that latest value in a ref that every state update writes
 * before setting state (never during render).
 *
 * @module
 */

import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { createMemoryStorageProvider } from '@molecule/app-storage'

import { useAuthFormState } from '../useAuthFormState.js'

describe('useAuthFormState rapid updates', () => {
  it('composes successive setters called in one tick', async () => {
    const storage = createMemoryStorageProvider()
    const { result } = renderHook(() => useAuthFormState({ storage, storageKey: 'rapid' }))
    await waitFor(() => expect(result.current.hydrated).toBe(true))

    act(() => {
      result.current.setField('email', 'ada@example.com')
      result.current.setField('name', 'Ada')
      result.current.setFields({ organisation: 'Analytical Engines' })
    })

    expect(result.current.fields).toEqual({
      email: 'ada@example.com',
      name: 'Ada',
      organisation: 'Analytical Engines',
    })
    await waitFor(async () => {
      expect(await storage.get('rapid')).toEqual({
        email: 'ada@example.com',
        name: 'Ada',
        organisation: 'Analytical Engines',
      })
    })
  })
})
