// @vitest-environment jsdom

/**
 * Locale-switch reactivity for the components migrated off the static `t`.
 *
 * The static `import { t } from '@molecule/app-i18n'` reads the bonded provider
 * but nothing subscribes the calling component to locale changes, so after
 * `setLocale('fr')` its labels stayed in the old language until an unrelated
 * re-render happened to redraw them. `useTranslation()` from
 * `@molecule/app-react` subscribes through `useSyncExternalStore`, so a
 * component reading `t` from the hook re-renders on the switch. This test bonds
 * a provider with an `en` and a `fr` value for a key a migrated component
 * renders, renders it in `en`, switches to `fr` through `act`, and asserts the
 * DOM now shows the French value — it fails against the static-`t` code (the
 * label stays English) and passes against the migrated hook.
 *
 * @module
 */

import { act, cleanup, render } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

// Host-element stand-ins for React Native, so the accessibility props are
// visible in the rendered DOM (mirrors input-clear.test.ts).
vi.mock('react-native', () => {
  const host =
    (name: string) =>
    (props: Record<string, unknown>): ReturnType<typeof createElement> =>
      createElement(
        'span',
        {
          'data-rn': name,
          role: props.accessibilityRole as string | undefined,
          'aria-label': props.accessibilityLabel as string | undefined,
        },
        props.children as never,
      )
  return {
    View: host('View'),
    Text: host('Text'),
    Pressable: host('Pressable'),
    ActivityIndicator: host('ActivityIndicator'),
  }
})

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () =>
    new Proxy(
      {},
      {
        get: (_target, prop) =>
          prop === 'cn'
            ? (...names: unknown[]) => names.filter(Boolean).join(' ')
            : () => String(prop),
      },
    ),
}))

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

beforeEach(() => {
  // Outside an I18nProvider the hook (and previously the static `t`) reads the
  // bonded provider, so bond one with both tables before rendering.
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: { 'ui.spinner.loading': 'Loading' } },
    { code: 'fr', name: 'French', translations: { 'ui.spinner.loading': 'Chargement' } },
  ])
  setProvider(provider)
})

afterEach(() => {
  cleanup()
})

describe('components migrated off the static t re-render on a locale switch', () => {
  it('Spinner renders the translated loading label after setLocale', async () => {
    const { Spinner } = await import('../components/Spinner.js')
    const { container } = render(createElement(Spinner))
    expect(container.querySelector('[aria-label]')?.getAttribute('aria-label')).toBe('Loading')

    // The switch itself: the component must re-render in French. Against the
    // static `t` this stays 'Loading' — nothing subscribed it to the provider.
    await act(async () => {
      await provider.setLocale('fr')
    })
    expect(container.querySelector('[aria-label]')?.getAttribute('aria-label')).toBe('Chargement')
  })
})
