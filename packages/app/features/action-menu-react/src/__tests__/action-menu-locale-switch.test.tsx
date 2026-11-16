// @vitest-environment jsdom
/**
 * Locale-switch reactivity for ActionMenu's trigger label.
 *
 * The label used to be a prop-parameter default (`triggerAriaLabel = 'Actions'`),
 * which no provider could ever translate or re-render. It now flows through
 * `useTranslation()` from `@molecule/app-react`, which subscribes through
 * `useSyncExternalStore`, so the trigger re-renders on a locale switch. This
 * test bonds a provider with an `en` and a `de` value for the key, renders in
 * `en`, switches to `de` through `act`, and asserts the aria-label now shows
 * the German value.
 *
 * @module
 */
import { act, cleanup, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

// A Proxy ClassMap that echoes each accessed member name back as its token —
// the same mock the React suite uses.
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

// Mock Button forwards every pass-through attribute (aria-*, data-mol-id) onto
// a native <button>, as the React suite's Button mock does.
vi.mock('@molecule/app-ui-react', () => ({
  Button: ({
    children,
    onClick,
    ['aria-label']: ariaLabel,
    ['aria-haspopup']: ariaHaspopup,
    ['aria-expanded']: ariaExpanded,
    ['data-mol-id']: dataMolId,
  }: {
    children?: ReactNode
    onClick?: () => void
    'aria-label'?: string
    'aria-haspopup'?: string
    'aria-expanded'?: boolean
    'data-mol-id'?: string
  }) =>
    createElement(
      'button',
      {
        'data-button': '',
        onClick,
        'aria-label': ariaLabel,
        'aria-haspopup': ariaHaspopup,
        'aria-expanded': ariaExpanded,
        'data-mol-id': dataMolId,
      },
      children,
    ),
}))

const { ActionMenu } = await import('../ActionMenu.js')

const items = [
  { id: 'edit', label: 'Edit' },
  { id: 'delete', label: 'Delete', destructive: true },
]

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: { 'actionMenu.aria.trigger': 'Actions' } },
    { code: 'de', name: 'German', translations: { 'actionMenu.aria.trigger': 'Aktionen' } },
  ])
  setProvider(provider)
})

afterEach(() => {
  cleanup()
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('ActionMenu locale switch', () => {
  it('the trigger label follows a locale switch', async () => {
    const { container } = render(createElement(ActionMenu, { items }))
    const trigger = container.querySelector('[data-mol-id="action-menu-trigger"]')
    expect(trigger?.getAttribute('aria-label')).toBe('Actions')

    // The switch itself: the trigger must re-render in German. Against the
    // old parameter default this stayed 'Actions' — nothing read the provider.
    await act(async () => {
      await provider.setLocale('de')
    })
    expect(trigger?.getAttribute('aria-label')).toBe('Aktionen')
  })
})
