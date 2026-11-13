// @vitest-environment jsdom

/**
 * Locale-switch reactivity for PasswordStrengthMeter's strength label.
 *
 * The static `import { t } from '@molecule/app-i18n'` reads the bonded
 * provider but nothing subscribes the calling component to locale changes, so
 * after `setLocale('fr')` its labels stayed in the old language until an
 * unrelated re-render happened to redraw them. `useTranslation()` from
 * `@molecule/app-react` subscribes through `useSyncExternalStore`, so a
 * component reading `t` from the hook re-renders on the switch. This test
 * bonds a provider with an `en` and a `fr` value for a key the component
 * renders, renders it in `en`, switches to `fr` through `act`, and asserts
 * the DOM now shows the French value.
 *
 * @module
 */

import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { PasswordStrengthMeter } from '../PasswordStrengthMeter.js'

/**
 * Build a UIClassMap stub via Proxy: `cn(...)` joins truthy strings,
 * every other property/method access returns its key as a string token.
 *
 * @returns A stub UIClassMap suitable for tests.
 */
function buildStubClassMap(): UIClassMap {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop): unknown {
      if (prop === 'cn') {
        return (...classes: unknown[]) =>
          classes.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
      }
      const token = String(prop)
      const fn = (..._args: unknown[]): string => token
      return new Proxy(fn, {
        get(_t, key) {
          if (key === Symbol.toPrimitive || key === 'toString') return () => token
          return undefined
        },
      })
    },
  }
  return new Proxy({}, handler) as unknown as UIClassMap
}

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

beforeEach(() => {
  setClassMap(buildStubClassMap())
  provider = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', translations: { 'passwordStrengthMeter.label.0': 'Very weak' } },
    {
      code: 'fr',
      name: 'French',
      translations: { 'passwordStrengthMeter.label.0': 'Très faible' },
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

describe('PasswordStrengthMeter locale switch', () => {
  it('renders the strength label in French after setLocale', async () => {
    // An empty password scores 0, whose label key is `passwordStrengthMeter.label.0`.
    const { container } = render(<PasswordStrengthMeter password="" />)
    const label = (): string | null =>
      container.querySelector('[data-mol-id="password-strength-meter-label"]')?.textContent ?? null
    expect(label()).toBe('Very weak')

    // The switch itself: the meter must re-render in French. Against the
    // static `t` this stays 'Very weak' — nothing subscribed it to the provider.
    await act(async () => {
      await provider.setLocale('fr')
    })
    expect(label()).toBe('Très faible')
  })
})
