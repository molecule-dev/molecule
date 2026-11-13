// @vitest-environment jsdom

/**
 * Locale-switch reactivity for the chat/IDE components migrated off the static
 * `t` (batch A: ActivityCard → QuickPicker).
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
import type { JSX, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider as I18nProviderType } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { ThemeProvider } from '@molecule/app-react'
import type { Theme, ThemeProvider as ThemeProviderType } from '@molecule/app-theme'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { QuickPicker } from '../components/QuickPicker.js'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProviderType

/** A minimal light theme so `useThemeMode` (QuickPicker's styling hook) resolves. */
function buildThemeProvider(): ThemeProviderType {
  const theme: Theme = {
    name: 'light',
    mode: 'light',
    colors: {
      background: { primary: '#ffffff' },
      text: { primary: '#000000' },
      brand: { primary: '#0066cc' },
      semantic: { success: '#00cc00' },
      borders: { default: '#cccccc' },
      overlay: { default: 'rgba(0,0,0,0.5)' },
      shadow: { default: 'rgba(0,0,0,0.1)' },
    },
    breakpoints: {
      mobileS: '320px',
      mobileM: '375px',
      mobileL: '425px',
      tablet: '768px',
      laptop: '1024px',
      laptopL: '1440px',
      desktop: '2560px',
    },
    spacing: {},
    typography: { fontFamily: {}, fontSize: {}, fontWeight: {}, lineHeight: {} },
    borderRadius: {},
    shadows: {},
    transitions: {},
    zIndex: {},
  }
  return {
    getTheme: () => theme,
    getThemeName: () => 'light',
    getThemes: () => ['light', 'dark'],
    setTheme: () => {},
    toggleMode: () => {},
    onThemeChange: () => () => {},
  }
}

/** Wrap children in the theme context (the i18n side rides the bonded provider). */
function wrap(children: ReactNode): JSX.Element {
  return <ThemeProvider provider={buildThemeProvider()}>{children}</ThemeProvider>
}

beforeEach(() => {
  // jsdom has no scrollIntoView; QuickPicker scrolls the selected row into view.
  Element.prototype.scrollIntoView = (): void => {}
  setClassMap(classMap)
  // The static `t` (and, outside an I18nProvider, useTranslation) reads the
  // bonded provider, so bond one with both tables before rendering.
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: { 'ide.quickPicker.loading': 'Loading…' } },
    { code: 'fr', name: 'French', translations: { 'ide.quickPicker.loading': 'Chargement…' } },
  ])
  setProvider(provider)
})

afterEach(() => {
  cleanup()
})

describe('components migrated off the static t re-render on a locale switch', () => {
  it('QuickPicker renders the translated loading label after setLocale', async () => {
    const onSelect = vi.fn()
    const onDismiss = vi.fn()
    const { container } = render(
      wrap(<QuickPicker items={[]} onSelect={onSelect} onDismiss={onDismiss} loading />),
    )
    expect(container.textContent).toContain('Loading…')

    // The switch itself: the component must re-render in French. Against the
    // static `t` this stays 'Loading…' — nothing subscribed it to the provider.
    await act(async () => {
      await provider.setLocale('fr')
    })
    expect(container.textContent).toContain('Chargement…')
  })
})
