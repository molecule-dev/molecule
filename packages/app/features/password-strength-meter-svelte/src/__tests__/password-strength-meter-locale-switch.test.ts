// @vitest-environment jsdom
/**
 * Locale-switch reactivity for the Svelte meter's strength label.
 *
 * `useTranslation()` from `@molecule/app-svelte` returns a `t` that reads the
 * provider's locale-version store, so markup that calls it re-renders on a
 * switch the way React's render-time `t` calls do. This test bonds a provider
 * with an `en` and a `fr` value for a key the component renders, renders it in
 * `en`, switches to `fr`, and asserts the DOM now shows the French value.
 */
import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import PasswordStrengthMeter from '../PasswordStrengthMeter.svelte'
import type { PasswordStrengthMeterProps } from '../types.js'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

/** The instances mounted during one test, unmounted in `afterEach`. */
const mounted: ReturnType<typeof mount>[] = []

/**
 * Mounts a meter and returns its host element.
 *
 * @param props - The meter's props.
 * @returns The host element whose children the meter rendered.
 */
function render(props: PasswordStrengthMeterProps): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted.push(mount(PasswordStrengthMeter, { target: host, props }))
  flushSync()
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

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('PasswordStrengthMeter locale switch', () => {
  it('renders the strength label in French after setLocale', async () => {
    // An empty password scores 0, whose label key is `passwordStrengthMeter.label.0`.
    const host = render({ password: '' })
    const label = (): string | null =>
      host.querySelector('[data-mol-id="password-strength-meter-label"]')?.textContent ?? null
    expect(label()).toBe('Very weak')

    // The switch itself: the meter must re-render in French. A label read from
    // the static `t` would stay 'Very weak' — nothing would subscribe it.
    await provider.setLocale('fr')
    flushSync()
    expect(label()).toBe('Très faible')
  })
})
