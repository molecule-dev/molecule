// @vitest-environment jsdom

/**
 * Locale-switch reactivity for the toolbar's `aria-label`.
 *
 * `useTranslation()` from `@molecule/app-react` subscribes through
 * `useSyncExternalStore`, so a component reading `t` from the hook re-renders
 * on the switch. This test bonds a provider with an `en` and a `fr` value for
 * the key the component renders, renders it in `en`, switches to `fr` through
 * `act`, and asserts the DOM now shows the French value.
 *
 * @module
 */

import { act, cleanup, render } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

vi.mock('@molecule/app-ui', () => ({
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
vi.mock('@molecule/app-ui-react', () => ({
  Button: ({ children }: { children?: ReactNode }) =>
    createElement('button', { 'data-button': '' }, children),
}))

const { BulkActionToolbar } = await import('../BulkActionToolbar.js')

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

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

afterEach(() => {
  cleanup()
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

const actions = [
  { id: 'archive', label: 'Archive', onClick: () => {} },
  { id: 'delete', label: 'Delete', onClick: () => {}, destructive: true },
]

describe('BulkActionToolbar locale switch', () => {
  it('renders the toolbar label in French after setLocale', async () => {
    const { container } = render(createElement(BulkActionToolbar, { count: 1, actions }))
    const region = () => container.querySelector('[role="region"]')!
    expect(region().getAttribute('aria-label')).toBe('Bulk actions')

    // The switch itself: the component must re-render in French. Against the
    // static `t` this stays 'Bulk actions' — nothing subscribed it to the provider.
    await act(async () => {
      await provider.setLocale('fr')
    })
    expect(region().getAttribute('aria-label')).toBe('Actions groupées')
  })
})
