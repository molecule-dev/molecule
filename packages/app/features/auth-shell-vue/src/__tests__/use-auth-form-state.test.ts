// @vitest-environment jsdom
/**
 * Unit tests for the Vue auth-form persistence — a port of
 * `@molecule/app-auth-shell-react/src/__tests__/use-auth-form-state.test.tsx`:
 * the same behavioral assertions, mounted with Vue in jsdom.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick } from 'vue'

import { createMemoryStorageProvider } from '@molecule/app-storage'

import { AuthFormStateProvider, useAuthFormStateContext } from '../AuthFormStateProvider.js'
import { DEFAULT_AUTH_FORM_STATE_KEY, useAuthFormState } from '../useAuthFormState.js'

interface Hooked<T> {
  result: () => T
  unmount: () => void
}

const mounted: Hooked<unknown>[] = []

/**
 * Mounts a component that calls a composable, so its lifecycle hooks run.
 *
 * @param factory - The composable call.
 * @returns The captured result and an unmount function.
 */
function mountHook<T>(factory: () => T): Hooked<T> {
  let result!: T
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({
      setup() {
        result = factory()
        return () => null
      },
    }),
  )
  app.mount(host)
  const hooked: Hooked<T> = {
    result: () => result,
    unmount: () => {
      app.unmount()
      host.remove()
    },
  }
  mounted.push(hooked as Hooked<unknown>)
  return hooked
}

afterEach(() => {
  for (const m of mounted.splice(0)) m.unmount()
})

describe('useAuthFormState', () => {
  it('writes set fields to the injected storage adapter (injection)', async () => {
    const storage = createMemoryStorageProvider()
    const hook = mountHook(() => useAuthFormState({ storage, storageKey: 'k' }))
    await vi.waitFor(() => expect(hook.result().hydrated.value).toBe(true))

    hook.result().setField('email', 'a@b.com')

    expect(hook.result().fields.value.email).toBe('a@b.com')
    await vi.waitFor(async () => {
      expect(await storage.get('k')).toEqual({ email: 'a@b.com' })
    })
  })

  it('defaults to the documented storage key when none is given', async () => {
    const storage = createMemoryStorageProvider()
    const hook = mountHook(() => useAuthFormState({ storage }))
    await vi.waitFor(() => expect(hook.result().hydrated.value).toBe(true))

    hook.result().setField('email', 'keyed@x.com')

    await vi.waitFor(async () => {
      expect(await storage.get(DEFAULT_AUTH_FORM_STATE_KEY)).toEqual({ email: 'keyed@x.com' })
    })
  })

  it('persists email across view switches (unmount of one view, mount of another)', async () => {
    const storage = createMemoryStorageProvider()

    // Login view types an email, then navigates away (unmount).
    const login = mountHook(() => useAuthFormState({ storage, storageKey: 'shared' }))
    await vi.waitFor(() => expect(login.result().hydrated.value).toBe(true))
    login.result().setField('email', 'persist@me.com')
    await vi.waitFor(async () => {
      expect(await storage.get('shared')).toEqual({ email: 'persist@me.com' })
    })
    login.unmount()

    // Signup view mounts against the same backing store and re-hydrates.
    const signup = mountHook(() => useAuthFormState({ storage, storageKey: 'shared' }))
    await vi.waitFor(() => expect(signup.result().hydrated.value).toBe(true))
    await nextTick()
    expect(signup.result().fields.value.email).toBe('persist@me.com')
  })

  it('clears persisted state and removes the key on success', async () => {
    const storage = createMemoryStorageProvider()
    const hook = mountHook(() => useAuthFormState({ storage, storageKey: 'k' }))
    await vi.waitFor(() => expect(hook.result().hydrated.value).toBe(true))

    hook.result().setField('email', 'gone@soon.com')
    await vi.waitFor(async () => {
      expect(await storage.get('k')).toEqual({ email: 'gone@soon.com' })
    })

    hook.result().clear()

    expect(hook.result().fields.value).toEqual({})
    await vi.waitFor(async () => {
      expect(await storage.get('k')).toBeNull()
    })
  })

  it('merges multiple shared fields via setFields', async () => {
    const storage = createMemoryStorageProvider()
    const hook = mountHook(() => useAuthFormState({ storage, storageKey: 'k' }))
    await vi.waitFor(() => expect(hook.result().hydrated.value).toBe(true))

    hook.result().setField('email', 'multi@x.com')
    hook.result().setFields({ name: 'Ada' })

    expect(hook.result().fields.value).toEqual({ email: 'multi@x.com', name: 'Ada' })
    await vi.waitFor(async () => {
      expect(await storage.get('k')).toEqual({ email: 'multi@x.com', name: 'Ada' })
    })
  })

  it('composes successive setters called in one tick', async () => {
    const storage = createMemoryStorageProvider()
    const hook = mountHook(() => useAuthFormState({ storage, storageKey: 'rapid' }))
    await vi.waitFor(() => expect(hook.result().hydrated.value).toBe(true))

    hook.result().setField('email', 'ada@example.com')
    hook.result().setField('name', 'Ada')
    hook.result().setFields({ organisation: 'Analytical Engines' })

    expect(hook.result().fields.value).toEqual({
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
    const hook = mountHook(() =>
      useAuthFormState({ storage, storageKey: 'k', initialFields: { email: 'seed@x.com' } }),
    )
    expect(hook.result().fields.value.email).toBe('seed@x.com')
  })

  it('falls back to a process-shared in-memory store (cross-view without injection)', async () => {
    const key = `default-${Math.random()}`

    const a = mountHook(() => useAuthFormState({ storageKey: key }))
    await vi.waitFor(() => expect(a.result().hydrated.value).toBe(true))
    a.result().setField('email', 'shared@default.com')
    a.unmount()

    const b = mountHook(() => useAuthFormState({ storageKey: key }))
    await vi.waitFor(() => expect(b.result().fields.value.email).toBe('shared@default.com'))
  })
})

describe('AuthFormStateProvider / useAuthFormStateContext', () => {
  it('shares one state instance with descendant forms and clears on success', async () => {
    const storage = createMemoryStorageProvider()
    let ctx!: ReturnType<typeof useAuthFormStateContext>
    const Child = defineComponent({
      setup() {
        ctx = useAuthFormStateContext()
        return () => null
      },
    })
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = createApp(
      defineComponent({
        render: () =>
          h(AuthFormStateProvider, { storage, storageKey: 'ctx' }, { default: () => h(Child) }),
      }),
    )
    app.mount(host)
    mounted.push({
      result: () => ctx,
      unmount: () => {
        app.unmount()
        host.remove()
      },
    })

    await vi.waitFor(() => expect(ctx.hydrated.value).toBe(true))
    ctx.setField('email', 'ctx@me.com')
    await vi.waitFor(async () => {
      expect(await storage.get('ctx')).toEqual({ email: 'ctx@me.com' })
    })

    ctx.clear()
    expect(ctx.fields.value).toEqual({})
  })

  describe('outside a provider', () => {
    it('throws a helpful error', () => {
      expect(() => useAuthFormStateContext()).toThrow(/AuthFormStateProvider/)
    })
  })
})
