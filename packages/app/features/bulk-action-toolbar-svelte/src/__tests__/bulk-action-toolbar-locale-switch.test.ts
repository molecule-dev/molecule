// @vitest-environment jsdom
/**
 * Locale-switch reactivity for the Svelte `BulkActionToolbar`'s toolbar
 * label — a port of
 * `@molecule/app-bulk-action-toolbar-react/src/__tests__/bulk-action-toolbar-locale-switch.test.tsx`:
 * the same test name and assertion. `useTranslation()` from
 * `@molecule/app-svelte` subscribes to the provider, so the component
 * re-renders on the switch. This test bonds a provider with an `en` and a
 * `fr` value for the key the component renders, renders it in `en`, switches
 * to `fr`, and asserts the DOM now shows the French value.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
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

import { BulkActionToolbar } from '../components.js'
import type { BulkActionToolbarProps } from '../types.js'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider
/** The mounted instance, torn down after each test. */
let instance: ReturnType<typeof mount> | undefined

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: { 'bulkActions.aria.toolbar': 'Bulk actions' } },
    {
      code: 'fr',
      name: 'French',
      translations: { 'bulkActions.aria.toolbar': 'Actions groupées' },
    },
  ])
  setProvider(provider)
})

afterEach(async () => {
  if (instance) await unmount(instance)
  instance = undefined
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('BulkActionToolbar locale switch', () => {
  it('renders the toolbar label in French after setLocale', async () => {
    const actions = [
      { id: 'archive', label: 'Archive', onClick: () => {} },
      { id: 'delete', label: 'Delete', onClick: () => {}, destructive: true },
    ]
    const target = document.createElement('div')
    document.body.appendChild(target)
    const props: BulkActionToolbarProps = { count: 1, actions }
    instance = mount(BulkActionToolbar, { target, props: props as never })
    flushSync()
    const region = (): HTMLElement | null => target.querySelector('[role="region"]')
    expect(region()?.getAttribute('aria-label')).toBe('Bulk actions')

    // The switch itself: the component must re-render in French. Against the
    // static `t` this stays 'Bulk actions' — nothing subscribed it to the provider.
    await provider.setLocale('fr')
    flushSync()

    expect(region()?.getAttribute('aria-label')).toBe('Actions groupées')
  })
})
