// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written: a real Vue app with `moleculePlugin`
 * providing real auth/i18n/state/theme providers, rendered and clicked in the DOM.
 * Only `fetch` (the API server) is stubbed.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick } from 'vue'

import { createJWTAuthClient } from '@molecule/app-auth'
import { getProvider as getI18nProvider, registerLocaleModule } from '@molecule/app-i18n'
import * as commonLocales from '@molecule/app-locales-common'
import { provider as stateProvider } from '@molecule/app-state-zustand'
import { provider as themeProvider } from '@molecule/app-theme-css-variables'

import { moleculePlugin, useAuth, useStore, useTheme, useTranslation } from '../index.js'

interface User {
  id: string
  name: string
}

registerLocaleModule(commonLocales)
const inbox = stateProvider.createStore({ initialState: { unread: 3 } })

const Dashboard = defineComponent({
  setup() {
    // Composables are inject()-based: call them here in setup(), nowhere else.
    const { user, isAuthenticated } = useAuth<User>()
    const { t } = useTranslation()
    const { mode, toggleTheme } = useTheme()
    const unread = useStore(inbox, { selector: (state) => state.unread })

    return () =>
      h('main', { 'data-theme': mode.value }, [
        h(
          'h1',
          isAuthenticated.value
            ? t(
                'auth.modal.loggedInAs',
                { who: user.value?.name ?? '' },
                { defaultValue: 'Logged in as {{who}}' },
              )
            : t('auth.login.logIn', undefined, { defaultValue: 'Log in' }),
        ),
        h(
          'p',
          t('common.countUnread', { count: unread.value }, { defaultValue: '{{count}} unread' }),
        ),
        h(
          'button',
          { type: 'button', onClick: () => inbox.setState({ unread: 0 }) },
          t('common.markAllRead', undefined, { defaultValue: 'Mark all read' }),
        ),
        h(
          'button',
          { type: 'button', 'data-mol-id': 'toggle-theme', onClick: toggleTheme },
          t('theme.toggle', undefined, { defaultValue: 'Toggle theme' }),
        ),
      ])
  },
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('README @example', () => {
  it('mounts with moleculePlugin and reacts to store, theme and locale changes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 401 })),
    )
    document.body.innerHTML = '<div id="app"></div>'

    const app = createApp(Dashboard)
    app.use(moleculePlugin, {
      state: stateProvider,
      auth: createJWTAuthClient<User>({ baseURL: '/api' }),
      theme: themeProvider,
      i18n: getI18nProvider(),
    })
    app.mount('#app')

    const root = document.getElementById('app')
    expect(root?.querySelector('h1')?.textContent).toBe('Log in')
    expect(root?.querySelector('p')?.textContent).toBe('3 unread')

    const [markRead, toggle] = Array.from(root?.querySelectorAll('button') ?? [])
    markRead?.click()
    await nextTick()
    expect(root?.querySelector('p')?.textContent).toBe('0 unread')

    const before = themeProvider.getTheme().mode
    expect(root?.querySelector('main')?.getAttribute('data-theme')).toBe(before)
    toggle?.click()
    await nextTick()
    expect(root?.querySelector('main')?.getAttribute('data-theme')).toBe(
      before === 'light' ? 'dark' : 'light',
    )

    // The registered locale bond drives the text, not just the inline defaults.
    await getI18nProvider().setLocale('de')
    await nextTick()
    expect(root?.querySelector('h1')?.textContent).toBe(commonLocales.de['auth.login.logIn'])
    await getI18nProvider().setLocale('en')

    app.unmount()
  })
})
