// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createMemoryStorageProvider } from '@molecule/app-storage'

import { AuthFormStateProvider, useAuthFormStateContext } from '../AuthFormStateProvider.js'
import { DEFAULT_AUTH_FORM_STATE_KEY, useAuthFormState } from '../useAuthFormState.js'

describe('useAuthFormState', () => {
  it('writes set fields to the injected storage adapter (injection)', async () => {
    const storage = createMemoryStorageProvider()
    const { result } = renderHook(() => useAuthFormState({ storage, storageKey: 'k' }))
    await waitFor(() => expect(result.current.hydrated).toBe(true))

    act(() => {
      result.current.setField('email', 'a@b.com')
    })

    expect(result.current.fields.email).toBe('a@b.com')
    await waitFor(async () => {
      expect(await storage.get('k')).toEqual({ email: 'a@b.com' })
    })
  })

  it('defaults to the documented storage key when none is given', async () => {
    const storage = createMemoryStorageProvider()
    const { result } = renderHook(() => useAuthFormState({ storage }))
    await waitFor(() => expect(result.current.hydrated).toBe(true))

    act(() => {
      result.current.setField('email', 'keyed@x.com')
    })

    await waitFor(async () => {
      expect(await storage.get(DEFAULT_AUTH_FORM_STATE_KEY)).toEqual({ email: 'keyed@x.com' })
    })
  })

  it('persists email across view switches (unmount of one view, mount of another)', async () => {
    const storage = createMemoryStorageProvider()

    // Login view types an email, then navigates away (unmount).
    const login = renderHook(() => useAuthFormState({ storage, storageKey: 'shared' }))
    await waitFor(() => expect(login.result.current.hydrated).toBe(true))
    act(() => {
      login.result.current.setField('email', 'persist@me.com')
    })
    await waitFor(async () => {
      expect(await storage.get('shared')).toEqual({ email: 'persist@me.com' })
    })
    login.unmount()

    // Signup view mounts against the same backing store and re-hydrates.
    const signup = renderHook(() => useAuthFormState({ storage, storageKey: 'shared' }))
    await waitFor(() => expect(signup.result.current.hydrated).toBe(true))
    expect(signup.result.current.fields.email).toBe('persist@me.com')
  })

  it('clears persisted state and removes the key on success', async () => {
    const storage = createMemoryStorageProvider()
    const { result } = renderHook(() => useAuthFormState({ storage, storageKey: 'k' }))
    await waitFor(() => expect(result.current.hydrated).toBe(true))

    act(() => {
      result.current.setField('email', 'gone@soon.com')
    })
    await waitFor(async () => {
      expect(await storage.get('k')).toEqual({ email: 'gone@soon.com' })
    })

    act(() => {
      result.current.clear()
    })

    expect(result.current.fields).toEqual({})
    await waitFor(async () => {
      expect(await storage.get('k')).toBeNull()
    })
  })

  it('merges multiple shared fields via setFields', async () => {
    const storage = createMemoryStorageProvider()
    const { result } = renderHook(() => useAuthFormState({ storage, storageKey: 'k' }))
    await waitFor(() => expect(result.current.hydrated).toBe(true))

    act(() => {
      result.current.setField('email', 'multi@x.com')
    })
    act(() => {
      result.current.setFields({ name: 'Ada' })
    })

    expect(result.current.fields).toEqual({ email: 'multi@x.com', name: 'Ada' })
    await waitFor(async () => {
      expect(await storage.get('k')).toEqual({ email: 'multi@x.com', name: 'Ada' })
    })
  })

  it('seeds from initialFields before hydration completes', () => {
    const storage = createMemoryStorageProvider()
    const { result } = renderHook(() =>
      useAuthFormState({ storage, storageKey: 'k', initialFields: { email: 'seed@x.com' } }),
    )
    expect(result.current.fields.email).toBe('seed@x.com')
  })

  it('falls back to a process-shared in-memory store (cross-view without injection)', async () => {
    const key = `default-${Math.random()}`

    const a = renderHook(() => useAuthFormState({ storageKey: key }))
    await waitFor(() => expect(a.result.current.hydrated).toBe(true))
    act(() => {
      a.result.current.setField('email', 'shared@default.com')
    })
    a.unmount()

    const b = renderHook(() => useAuthFormState({ storageKey: key }))
    await waitFor(() => expect(b.result.current.fields.email).toBe('shared@default.com'))
  })
})

describe('AuthFormStateProvider / useAuthFormStateContext', () => {
  it('shares one state instance with descendant forms and clears on success', async () => {
    const storage = createMemoryStorageProvider()
    const wrapper = ({ children }: { children: ReactNode }): ReactNode =>
      createElement(AuthFormStateProvider, { storage, storageKey: 'ctx' }, children)

    const { result } = renderHook(() => useAuthFormStateContext(), { wrapper })
    await waitFor(() => expect(result.current.hydrated).toBe(true))

    act(() => {
      result.current.setField('email', 'ctx@me.com')
    })
    await waitFor(async () => {
      expect(await storage.get('ctx')).toEqual({ email: 'ctx@me.com' })
    })

    act(() => {
      result.current.clear()
    })
    expect(result.current.fields).toEqual({})
  })

  describe('outside a provider', () => {
    // React logs the thrown render error; silence it for this expected case.
    beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))
    afterEach(() => vi.mocked(console.error).mockRestore())

    it('throws a helpful error', () => {
      expect(() => renderHook(() => useAuthFormStateContext())).toThrow(/AuthFormStateProvider/)
    })
  })
})
