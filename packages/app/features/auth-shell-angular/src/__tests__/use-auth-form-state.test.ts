// @vitest-environment jsdom
/**
 * Unit tests of the Angular auth-form persistence — the port of
 * `@molecule/app-auth-shell-react/src/__tests__/use-auth-form-state.test.tsx`:
 * the same behavioral assertions, mounted through Angular's real renderer.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'
import { createMemoryStorageProvider, type StorageProvider } from '@molecule/app-storage'

import {
  AuthFormStateProvider,
  useAuthFormStateContext,
} from '../auth-form-state-provider.component.js'
import type { AuthFormState } from '../types.js'
import { DEFAULT_AUTH_FORM_STATE_KEY, useAuthFormState } from '../use-auth-form-state.js'

const teardown: Array<() => Promise<void>> = []

/** A counter giving each JIT host a unique selector (no NG0912 collisions). */
let hostSeq = 0

afterEach(async () => {
  for (const stop of teardown.splice(0)) await stop()
})

/**
 * Creates an app and attaches a host view, returning an idempotent teardown.
 *
 * @param host - The host component type.
 * @returns A teardown promise.
 */
async function attach(host: Type<unknown>): Promise<() => Promise<void>> {
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref = createComponent(host, { environmentInjector: appRef.injector })
  const element = ref.location.nativeElement as HTMLElement
  document.body.appendChild(element)
  appRef.attachView(ref.hostView)
  appRef.tick()
  let done = false
  const stop = async (): Promise<void> => {
    if (done) return
    done = true
    appRef.destroy()
    element.remove()
  }
  teardown.push(stop)
  return stop
}

/**
 * Mounts a host whose construction runs a primitive (an injection context).
 *
 * @param run - The function that calls the hook.
 * @returns A teardown promise.
 */
async function mountRunner(run: () => void): Promise<() => Promise<void>> {
  const Host = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: `mol-run-host-${++hostSeq}`,
    standalone: true,
    template: '',
  })(
    class RunHost {
      constructor() {
        run()
      }
    },
  )
  return attach(Host)
}

/**
 * Mounts an `<AuthFormStateProvider>` around a descendant that reads the context.
 *
 * @param storage - The backing storage provider.
 * @param run - Called in the descendant's construction to read the context.
 * @returns A teardown promise.
 */
async function mountProvider(
  storage: StorageProvider,
  run: () => void,
): Promise<() => Promise<void>> {
  const seq = ++hostSeq
  const Reader = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: `mol-ctx-reader-${seq}`,
    standalone: true,
    template: '',
  })(
    class CtxReader {
      constructor() {
        run()
      }
    },
  )
  const Host = Component({
    selector: `mol-provider-host-${seq}`,
    standalone: true,
    imports: [AuthFormStateProvider, Reader],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<div mol-auth-form-state-provider [storage]="storage" storageKey="ctx"><mol-ctx-reader-${seq}></mol-ctx-reader-${seq}></div>`,
  })(
    class ProviderHost {
      /** The storage provider the template binds. */
      storage = storage
    },
  )
  return attach(Host)
}

describe('useAuthFormState', () => {
  it('writes set fields to the injected storage adapter (injection)', async () => {
    const storage = createMemoryStorageProvider()
    let state!: AuthFormState
    await mountRunner(() => {
      state = useAuthFormState({ storage, storageKey: 'k' })
    })
    await vi.waitFor(() => expect(state.hydrated()).toBe(true))

    state.setField('email', 'a@b.com')

    expect(state.fields().email).toBe('a@b.com')
    await vi.waitFor(async () => {
      expect(await storage.get('k')).toEqual({ email: 'a@b.com' })
    })
  })

  it('defaults to the documented storage key when none is given', async () => {
    const storage = createMemoryStorageProvider()
    let state!: AuthFormState
    await mountRunner(() => {
      state = useAuthFormState({ storage })
    })
    await vi.waitFor(() => expect(state.hydrated()).toBe(true))

    state.setField('email', 'keyed@x.com')

    await vi.waitFor(async () => {
      expect(await storage.get(DEFAULT_AUTH_FORM_STATE_KEY)).toEqual({ email: 'keyed@x.com' })
    })
  })

  it('persists email across view switches (unmount of one view, mount of another)', async () => {
    const storage = createMemoryStorageProvider()

    // Login view types an email, then navigates away (unmount).
    let login!: AuthFormState
    const stopLogin = await mountRunner(() => {
      login = useAuthFormState({ storage, storageKey: 'shared' })
    })
    await vi.waitFor(() => expect(login.hydrated()).toBe(true))
    login.setField('email', 'persist@me.com')
    await vi.waitFor(async () => {
      expect(await storage.get('shared')).toEqual({ email: 'persist@me.com' })
    })
    await stopLogin()

    // Signup view mounts against the same backing store and re-hydrates.
    let signup!: AuthFormState
    await mountRunner(() => {
      signup = useAuthFormState({ storage, storageKey: 'shared' })
    })
    await vi.waitFor(() => expect(signup.hydrated()).toBe(true))
    expect(signup.fields().email).toBe('persist@me.com')
  })

  it('clears persisted state and removes the key on success', async () => {
    const storage = createMemoryStorageProvider()
    let state!: AuthFormState
    await mountRunner(() => {
      state = useAuthFormState({ storage, storageKey: 'k' })
    })
    await vi.waitFor(() => expect(state.hydrated()).toBe(true))

    state.setField('email', 'gone@soon.com')
    await vi.waitFor(async () => {
      expect(await storage.get('k')).toEqual({ email: 'gone@soon.com' })
    })

    state.clear()

    expect(state.fields()).toEqual({})
    await vi.waitFor(async () => {
      expect(await storage.get('k')).toBeNull()
    })
  })

  it('merges multiple shared fields via setFields', async () => {
    const storage = createMemoryStorageProvider()
    let state!: AuthFormState
    await mountRunner(() => {
      state = useAuthFormState({ storage, storageKey: 'k' })
    })
    await vi.waitFor(() => expect(state.hydrated()).toBe(true))

    state.setField('email', 'multi@x.com')
    state.setFields({ name: 'Ada' })

    expect(state.fields()).toEqual({ email: 'multi@x.com', name: 'Ada' })
    await vi.waitFor(async () => {
      expect(await storage.get('k')).toEqual({ email: 'multi@x.com', name: 'Ada' })
    })
  })

  it('composes successive setters called in one tick', async () => {
    const storage = createMemoryStorageProvider()
    let state!: AuthFormState
    await mountRunner(() => {
      state = useAuthFormState({ storage, storageKey: 'rapid' })
    })
    await vi.waitFor(() => expect(state.hydrated()).toBe(true))

    state.setField('email', 'ada@example.com')
    state.setField('name', 'Ada')
    state.setFields({ organisation: 'Analytical Engines' })

    expect(state.fields()).toEqual({
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

  it('seeds from initialFields before hydration completes', async () => {
    const storage = createMemoryStorageProvider()
    let state!: AuthFormState
    await mountRunner(() => {
      state = useAuthFormState({ storage, storageKey: 'k', initialFields: { email: 'seed@x.com' } })
    })
    expect(state.fields().email).toBe('seed@x.com')
  })

  it('falls back to a process-shared in-memory store (cross-view without injection)', async () => {
    const key = `default-${Math.random()}`

    let a!: AuthFormState
    const stopA = await mountRunner(() => {
      a = useAuthFormState({ storageKey: key })
    })
    await vi.waitFor(() => expect(a.hydrated()).toBe(true))
    a.setField('email', 'shared@default.com')
    await stopA()

    let b!: AuthFormState
    await mountRunner(() => {
      b = useAuthFormState({ storageKey: key })
    })
    await vi.waitFor(() => expect(b.fields().email).toBe('shared@default.com'))
  })
})

describe('AuthFormStateProvider / useAuthFormStateContext', () => {
  it('shares one state instance with descendant forms and clears on success', async () => {
    const storage = createMemoryStorageProvider()
    let ctx!: AuthFormState
    await mountProvider(storage, () => {
      ctx = useAuthFormStateContext()
    })

    await vi.waitFor(() => expect(ctx.hydrated()).toBe(true))
    ctx.setField('email', 'ctx@me.com')
    await vi.waitFor(async () => {
      expect(await storage.get('ctx')).toEqual({ email: 'ctx@me.com' })
    })

    ctx.clear()
    expect(ctx.fields()).toEqual({})
  })

  describe('outside a provider', () => {
    it('throws a helpful error', async () => {
      let ctx!: AuthFormState
      await mountRunner(() => {
        ctx = useAuthFormStateContext()
      })
      expect(() => ctx.fields).toThrow(/AuthFormStateProvider/)
    })
  })
})
