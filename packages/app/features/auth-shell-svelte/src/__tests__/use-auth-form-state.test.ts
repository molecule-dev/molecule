// @vitest-environment jsdom
/**
 * Unit tests for the Svelte auth-form persistence — a port of
 * `@molecule/app-auth-shell-react/src/__tests__/use-auth-form-state.test.tsx`:
 * the same behavioral assertions, mounted with Svelte in jsdom.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { get } from 'svelte/store'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createMemoryStorageProvider } from '@molecule/app-storage'

import { useAuthFormStateContext } from '../context.js'
import type { AuthFormState } from '../types.js'
import { DEFAULT_AUTH_FORM_STATE_KEY, useAuthFormState } from '../useAuthFormState.js'
import HookHarness from './hook-harness.svelte'
import ProviderHarness from './provider-harness.svelte'

const teardown: Array<() => void> = []

afterEach(() => {
  for (const stop of teardown.splice(0)) stop()
  document.body.innerHTML = ''
})

/**
 * Mounts the hook harness so the hook's lifecycle runs.
 *
 * @param run - The function the harness calls during init (calls the hook).
 * @returns A teardown function.
 */
const mountHarness = (run: () => void): (() => void) => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const instance = mount(HookHarness, { target, props: { run } })
  flushSync()
  const stop = (): void => {
    unmount(instance)
    target.remove()
  }
  teardown.push(stop)
  return stop
}

describe('useAuthFormState', () => {
  it('writes set fields to the injected storage adapter (injection)', async () => {
    const storage = createMemoryStorageProvider()
    let state!: AuthFormState
    mountHarness(() => {
      state = useAuthFormState({ storage, storageKey: 'k' })
    })
    await vi.waitFor(() => expect(get(state.hydrated)).toBe(true))

    state.setField('email', 'a@b.com')

    expect(get(state.fields).email).toBe('a@b.com')
    await vi.waitFor(async () => {
      expect(await storage.get('k')).toEqual({ email: 'a@b.com' })
    })
  })

  it('defaults to the documented storage key when none is given', async () => {
    const storage = createMemoryStorageProvider()
    let state!: AuthFormState
    mountHarness(() => {
      state = useAuthFormState({ storage })
    })
    await vi.waitFor(() => expect(get(state.hydrated)).toBe(true))

    state.setField('email', 'keyed@x.com')

    await vi.waitFor(async () => {
      expect(await storage.get(DEFAULT_AUTH_FORM_STATE_KEY)).toEqual({ email: 'keyed@x.com' })
    })
  })

  it('persists email across view switches (unmount of one view, mount of another)', async () => {
    const storage = createMemoryStorageProvider()

    // Login view types an email, then navigates away (unmount).
    let login!: AuthFormState
    const stopLogin = mountHarness(() => {
      login = useAuthFormState({ storage, storageKey: 'shared' })
    })
    await vi.waitFor(() => expect(get(login.hydrated)).toBe(true))
    login.setField('email', 'persist@me.com')
    await vi.waitFor(async () => {
      expect(await storage.get('shared')).toEqual({ email: 'persist@me.com' })
    })
    stopLogin()

    // Signup view mounts against the same backing store and re-hydrates.
    let signup!: AuthFormState
    mountHarness(() => {
      signup = useAuthFormState({ storage, storageKey: 'shared' })
    })
    await vi.waitFor(() => expect(get(signup.hydrated)).toBe(true))
    expect(get(signup.fields).email).toBe('persist@me.com')
  })

  it('clears persisted state and removes the key on success', async () => {
    const storage = createMemoryStorageProvider()
    let state!: AuthFormState
    mountHarness(() => {
      state = useAuthFormState({ storage, storageKey: 'k' })
    })
    await vi.waitFor(() => expect(get(state.hydrated)).toBe(true))

    state.setField('email', 'gone@soon.com')
    await vi.waitFor(async () => {
      expect(await storage.get('k')).toEqual({ email: 'gone@soon.com' })
    })

    state.clear()

    expect(get(state.fields)).toEqual({})
    await vi.waitFor(async () => {
      expect(await storage.get('k')).toBeNull()
    })
  })

  it('merges multiple shared fields via setFields', async () => {
    const storage = createMemoryStorageProvider()
    let state!: AuthFormState
    mountHarness(() => {
      state = useAuthFormState({ storage, storageKey: 'k' })
    })
    await vi.waitFor(() => expect(get(state.hydrated)).toBe(true))

    state.setField('email', 'multi@x.com')
    state.setFields({ name: 'Ada' })

    expect(get(state.fields)).toEqual({ email: 'multi@x.com', name: 'Ada' })
    await vi.waitFor(async () => {
      expect(await storage.get('k')).toEqual({ email: 'multi@x.com', name: 'Ada' })
    })
  })

  it('composes successive setters called in one tick', async () => {
    const storage = createMemoryStorageProvider()
    let state!: AuthFormState
    mountHarness(() => {
      state = useAuthFormState({ storage, storageKey: 'rapid' })
    })
    await vi.waitFor(() => expect(get(state.hydrated)).toBe(true))

    state.setField('email', 'ada@example.com')
    state.setField('name', 'Ada')
    state.setFields({ organisation: 'Analytical Engines' })

    expect(get(state.fields)).toEqual({
      email: 'ada@example.com',
      name: 'Ada',
      organisation: 'Analytical Engines',
    })
    await vi.waitFor(async () => {
      expect(await storage.get('rapid')).toEqual({
        email: 'ada@example.com',
        name: 'Ada',
        organisation: 'Analytical Engines',
      })
    })
  })

  it('seeds from initialFields before hydration completes', () => {
    const storage = createMemoryStorageProvider()
    let state!: AuthFormState
    mountHarness(() => {
      state = useAuthFormState({ storage, storageKey: 'k', initialFields: { email: 'seed@x.com' } })
    })
    expect(get(state.fields).email).toBe('seed@x.com')
  })

  it('falls back to a process-shared in-memory store (cross-view without injection)', async () => {
    const key = `default-${Math.random()}`

    let a!: AuthFormState
    const stopA = mountHarness(() => {
      a = useAuthFormState({ storageKey: key })
    })
    await vi.waitFor(() => expect(get(a.hydrated)).toBe(true))
    a.setField('email', 'shared@default.com')
    stopA()

    let b!: AuthFormState
    mountHarness(() => {
      b = useAuthFormState({ storageKey: key })
    })
    await vi.waitFor(() => expect(get(b.fields).email).toBe('shared@default.com'))
  })
})

describe('AuthFormStateProvider / useAuthFormStateContext', () => {
  it('shares one state instance with descendant forms and clears on success', async () => {
    const storage = createMemoryStorageProvider()
    let ctx!: AuthFormState
    const target = document.createElement('div')
    document.body.appendChild(target)
    const instance = mount(ProviderHarness, {
      target,
      props: {
        storage,
        run: () => {
          ctx = useAuthFormStateContext()
        },
      },
    })
    flushSync()
    teardown.push(() => {
      unmount(instance)
      target.remove()
    })

    await vi.waitFor(() => expect(get(ctx.hydrated)).toBe(true))
    ctx.setField('email', 'ctx@me.com')
    await vi.waitFor(async () => {
      expect(await storage.get('ctx')).toEqual({ email: 'ctx@me.com' })
    })

    ctx.clear()
    expect(get(ctx.fields)).toEqual({})
  })

  describe('outside a provider', () => {
    it('throws a helpful error', () => {
      const target = document.createElement('div')
      document.body.appendChild(target)
      try {
        expect(() =>
          mount(HookHarness, { target, props: { run: () => useAuthFormStateContext() } }),
        ).toThrow(/AuthFormStateProvider/)
      } finally {
        target.remove()
      }
    })
  })
})
