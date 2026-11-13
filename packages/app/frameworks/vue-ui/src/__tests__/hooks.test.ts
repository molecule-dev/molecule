// @vitest-environment jsdom
/**
 * Tests for the internal composables the Vue UI components use (theme,
 * i18n, auth, router) over the `@molecule/app-vue` injection keys. They must
 * mirror `@molecule/app-react`'s hook semantics: reactive state kept current
 * through the service's notifications, and actions that call the service
 * exactly once.
 *
 * @module
 */

import { describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick } from 'vue'

import type { AuthClient, AuthState } from '@molecule/app-auth'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { createMemoryRouter, type Router } from '@molecule/app-routing'
import type { Theme, ThemeProvider } from '@molecule/app-theme'
import { createDarkTheme, createLightTheme } from '@molecule/app-theme'
import {
  createAuthPlugin,
  createI18nPlugin,
  createRouterPlugin,
  createThemePlugin,
} from '@molecule/app-vue'

import { useAuth } from '../hooks/useAuth.js'
import { useLocation, useMoleculeRouter } from '../hooks/useRouter.js'
import { useTheme } from '../hooks/useTheme.js'
import { useTranslation } from '../hooks/useTranslation.js'

/** A theme provider that records every mutating call. */
const fakeThemeProvider = (): ThemeProvider & { calls: string[] } => {
  const light = createLightTheme()
  const dark = createDarkTheme()
  const calls: string[] = []
  let theme: Theme = light
  const listeners = new Set<(t: Theme) => void>()
  const emit = (): void => {
    for (const l of listeners) l(theme)
  }
  return {
    calls,
    getTheme: () => theme,
    setTheme: (next) => {
      calls.push(`setTheme:${typeof next === 'string' ? next : next.mode}`)
      theme = typeof next === 'string' ? dark : next
      emit()
    },
    toggleMode: () => {
      calls.push('toggleMode')
      theme = theme.mode === 'dark' ? light : dark
      emit()
    },
    subscribe: (cb) => {
      listeners.add(cb)
      return () => {
        listeners.delete(cb)
      }
    },
    getThemes: () => [light, dark],
  }
}

/** An auth client fixed on one state, recording mutating calls. */
const fakeAuthClient = (
  initial: AuthState<Record<string, unknown>>,
): AuthClient<Record<string, unknown>> & { calls: string[] } => {
  const calls: string[] = []
  let state = initial
  const listeners = new Set<(s: AuthState<Record<string, unknown>>) => void>()
  const emit = (): void => {
    for (const l of listeners) l(state)
  }
  return {
    calls,
    getState: () => state,
    isAuthenticated: () => state.authenticated,
    getUser: () => state.user,
    getSessionRevision: () => 1,
    setUser: (user) => {
      calls.push('setUser')
      state = { ...state, user }
      emit()
    },
    getAccessToken: () => null,
    setAccessToken: () => undefined,
    setSession: () => undefined,
    getRefreshToken: () => null,
    login: async () => {
      calls.push('login')
      return { user: state.user, accessToken: 'token' } as never
    },
    logout: async () => {
      calls.push('logout')
      state = { ...state, status: 'unauthenticated', authenticated: false, user: null }
      emit()
    },
    register: async () => {
      calls.push('register')
      return { user: state.user, accessToken: 'token' } as never
    },
    refresh: async () => ({ user: state.user, accessToken: 'token' }) as never,
    requestPasswordReset: async () => undefined,
    confirmPasswordReset: async () => undefined,
    updateProfile: async (data) => {
      calls.push('updateProfile')
      return { ...(state.user ?? {}), ...data }
    },
    changePassword: async () => undefined,
    initialize: async () => undefined,
    whenRestored: async () => undefined,
    subscribe: (cb) => {
      listeners.add(cb)
      return () => {
        listeners.delete(cb)
      }
    },
    onAuthChange: (cb) => {
      listeners.add(cb)
      return () => {
        listeners.delete(cb)
      }
    },
    addEventListener: () => () => undefined,
    destroy: () => undefined,
  }
}

const authenticatedState: AuthState<Record<string, unknown>> = {
  status: 'authenticated',
  initialized: true,
  authenticated: true,
  user: { id: 'u1', name: 'Ada Lovelace', email: 'ada@example.com' },
  loading: false,
  error: null,
}

/**
 * Mounts a component whose setup runs `setup` and whose render reads
 * `render(result)`; returns the host element and the hook result.
 *
 * @param plugins - Vue plugins to install (the service providers).
 * @param setup - Runs in setup; returns the composable's result.
 * @param render - Builds the render function from the result.
 * @returns The mounted host and the captured result.
 */
const mountWith = async (
  plugins: unknown[],
  setup: () => unknown,
  render: (result: never) => () => unknown,
): Promise<{ host: HTMLElement; result: unknown }> => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const captured = { result: undefined as unknown }
  const app = createApp(
    defineComponent({
      setup() {
        captured.result = setup()
        const view = render(captured.result as never)
        return () => h('div', [view()])
      },
    }),
  )
  for (const p of plugins) app.use(p as never)
  app.mount(host)
  await nextTick()
  return { host, result: captured.result }
}

describe('useTheme', () => {
  it('reads mode, re-renders on provider change, and toggles via toggleMode', async () => {
    const provider = fakeThemeProvider()
    const { host, result } = await mountWith(
      [createThemePlugin(provider)],
      () => useTheme(),
      (r) => () => h('output', { 'data-mode': r.mode.value }),
    )
    const out = () => host.querySelector('output')
    expect(out()?.getAttribute('data-mode')).toBe('light')
    expect(provider.calls).toEqual([])
    ;(result as ReturnType<typeof useTheme>).toggleTheme()
    await nextTick()
    expect(provider.calls).toEqual(['toggleMode'])
    expect(out()?.getAttribute('data-mode')).toBe('dark')
  })

  it('setTheme forwards to the provider', async () => {
    const provider = fakeThemeProvider()
    const { result } = await mountWith(
      [createThemePlugin(provider)],
      () => useTheme(),
      (r) => () => h('output', r.themeName.value),
    )
    ;(result as ReturnType<typeof useTheme>).setTheme('dark')
    expect(provider.calls).toEqual(['setTheme:dark'])
  })

  it('throws without a theme provider', () => {
    const host = document.createElement('div')
    createApp(
      defineComponent({
        setup() {
          try {
            useTheme()
          } catch (error) {
            return () => h('b', (error as Error).message)
          }
          return () => h('b', 'no throw')
        },
      }),
    ).mount(host)
    expect(host.textContent).toContain('useTheme must be used within a theme provider')
  })
})

describe('useTranslation', () => {
  it('translates through the provider with default values', async () => {
    const provider = createSimpleI18nProvider()
    await provider.setLocale('en')
    const { host } = await mountWith(
      [createI18nPlugin(provider)],
      () => useTranslation(),
      (r) => () => h('output', r.t('common.loading', {}, { defaultValue: 'Loading...' })),
    )
    expect(host.textContent).toBe('Loading...')
  })

  it('setLocale forwards to the provider', async () => {
    const provider = createSimpleI18nProvider()
    const spy = vi.spyOn(provider, 'setLocale')
    const { result } = await mountWith(
      [createI18nPlugin(provider)],
      () => useTranslation(),
      (r) => () => h('output', r.locale.value),
    )
    ;(result as ReturnType<typeof useTranslation>).setLocale('de')
    expect(spy).toHaveBeenCalledWith('de')
  })
})

describe('useAuth', () => {
  it('exposes status and user from the client state', async () => {
    const client = fakeAuthClient(authenticatedState)
    const { host } = await mountWith(
      [createAuthPlugin(client as never)],
      () => useAuth(),
      (r) => () =>
        h('output', [
          h('span', { 'data-s': '' }, r.status.value),
          h(
            'span',
            { 'data-u': '' },
            String((r.user.value as { name?: string } | null)?.name ?? ''),
          ),
        ]),
    )
    expect(host.querySelector('[data-s]')?.textContent).toBe('authenticated')
    expect(host.querySelector('[data-u]')?.textContent).toBe('Ada Lovelace')
  })

  it('logout calls the client and state follows the notification', async () => {
    const client = fakeAuthClient(authenticatedState)
    const { host, result } = await mountWith(
      [createAuthPlugin(client as never)],
      () => useAuth(),
      (r) => () => h('output', { 'data-auth': String(r.isAuthenticated.value) }),
    )
    expect(host.querySelector('output')?.getAttribute('data-auth')).toBe('true')
    await (result as ReturnType<typeof useAuth>).logout()
    await nextTick()
    expect(client.calls).toEqual(['logout'])
    expect(host.querySelector('output')?.getAttribute('data-auth')).toBe('false')
  })
})

describe('useLocation', () => {
  it('tracks router navigation', async () => {
    const router: Router = createMemoryRouter({ initialEntries: ['/start'] })
    const { host } = await mountWith(
      [createRouterPlugin(router)],
      () => useLocation(),
      (r) => () => h('output', r.value.pathname),
    )
    expect(host.textContent).toBe('/start')
    router.navigate('/login')
    await nextTick()
    expect(host.textContent).toBe('/login')
  })
})

describe('useMoleculeRouter', () => {
  it('returns the installed router', async () => {
    const router: Router = createMemoryRouter({ initialEntries: ['/'] })
    const { host } = await mountWith(
      [createRouterPlugin(router)],
      () => useMoleculeRouter(),
      (r) => () => h('output', r.getLocation().pathname),
    )
    expect(host.textContent).toBe('/')
  })
})
