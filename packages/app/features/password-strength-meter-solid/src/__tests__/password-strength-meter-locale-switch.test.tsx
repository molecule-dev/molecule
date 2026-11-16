// @vitest-environment jsdom
/**
 * Locale-switch reactivity for the Solid meter's strength label.
 *
 * `useTranslation()` from `@molecule/app-solid` subscribes the calling
 * component to the provider's notifications through a signal, so a label read
 * through its `t` follows a switch. This test bonds a provider with an `en`
 * and a `fr` value for a key the component renders, renders it in `en`,
 * switches to `fr`, and asserts the DOM now shows the French value.
 *
 * @module
 */

import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

// A ClassMap proxy echoing each accessed member back as its token — the same
// mock the React suite uses (`setClassMap(buildStubClassMap())`).
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

import { PasswordStrengthMeter } from '../PasswordStrengthMeter.jsx'
import type { PasswordStrengthMeterProps } from '../types.js'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

/** The disposers of the roots mounted in one test. */
const disposers: Array<() => void> = []

/**
 * Renders a meter into a fresh host element.
 *
 * @param props - The meter's props.
 * @returns The host element whose children the meter rendered.
 */
function renderMeter(props: PasswordStrengthMeterProps): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  disposers.push(render(() => <PasswordStrengthMeter {...props} />, host))
  return host
}

beforeEach(() => {
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
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('PasswordStrengthMeter locale switch', () => {
  it('renders the strength label in French after setLocale', async () => {
    // An empty password scores 0, whose label key is `passwordStrengthMeter.label.0`.
    const host = renderMeter({ password: '' })
    const label = (): string | null =>
      host.querySelector('[data-mol-id="password-strength-meter-label"]')?.textContent ?? null
    expect(label()).toBe('Very weak')

    // The switch itself: the meter must re-render in French. A label read from
    // the static `t` would stay 'Very weak' — nothing would subscribe it.
    await provider.setLocale('fr')
    await Promise.resolve()
    expect(label()).toBe('Très faible')
  })
})
