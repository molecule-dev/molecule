// @vitest-environment jsdom
/**
 * Regression test for the static-`t` migration — Vue port of
 * `@molecule/app-ui-react/src/__tests__/locale-switch-rerender.test.tsx`: a
 * component that translated through the static `t` from `@molecule/app-i18n`
 * stayed in the old language after `setLocale` — nothing re-rendered it. The
 * migrated components read `t` from `useTranslation()` (`@molecule/app-vue`),
 * which subscribes to the bonded provider's locale notifications, so a switch
 * re-renders them in the new language.
 *
 * Rendered through the BONDED provider (`setProvider`) — the same path the
 * static `t` read — so the test proves exactly the fixed defect.
 *
 * @module
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

import { type App, createApp, h, nextTick } from 'vue'

import type { LocaleConfig } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

const { Spinner } = await import('../components/Spinner.js')

const LOCALES: LocaleConfig[] = [
  {
    code: 'en',
    name: 'English',
    direction: 'ltr',
    translations: { 'ui.spinner.loading': 'Loading' },
  },
  {
    code: 'fr',
    name: 'French',
    direction: 'ltr',
    translations: { 'ui.spinner.loading': 'Chargement' },
  },
]

const apps: App[] = []
const hosts: HTMLElement[] = []

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount()
  for (const host of hosts.splice(0)) host.remove()
})

/**
 * The mounted spinner's status element.
 *
 * @returns The `role="status"` element.
 */
function statusEl(): HTMLElement {
  const el = document.querySelector<HTMLElement>('[role="status"]')
  if (!el) throw new Error('no status element')
  return el
}

describe('components re-render in the new language after a locale switch', () => {
  it('Spinner announces its loading label in the switched-to locale', async () => {
    const provider = createSimpleI18nProvider('en', LOCALES)
    setProvider(provider)

    const host = document.createElement('div')
    document.body.appendChild(host)
    hosts.push(host)
    const app = createApp({ render: () => h(Spinner) })
    apps.push(app)
    app.mount(host)
    expect(statusEl().getAttribute('aria-label')).toBe('Loading')

    await provider.setLocale('fr')
    await nextTick()
    expect(statusEl().getAttribute('aria-label')).toBe('Chargement')
  })
})
