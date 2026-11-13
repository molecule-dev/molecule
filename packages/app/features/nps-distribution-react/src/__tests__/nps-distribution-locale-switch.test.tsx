/**
 * Locale-switch reactivity for NpsDistribution's score-line label.
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

import { NpsDistribution } from '../NpsDistribution.js'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    {
      code: 'en',
      name: 'English',
      translations: { 'nps-distribution.score.responses': '{{total}} responses' },
    },
    {
      code: 'fr',
      name: 'French',
      translations: { 'nps-distribution.score.responses': '{{total}} réponses' },
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

describe('NpsDistribution locale switch', () => {
  it('renders the responses label in French after setLocale', async () => {
    // 3 responses total (10, 9, 0).
    const { container } = render(<NpsDistribution scores={[10, 9, 0]} />)
    expect(container.textContent).toContain('3 responses')

    // The switch itself: the chart must re-render in French. Against the
    // static `t` this stays English — nothing subscribed it to the provider.
    await act(async () => {
      await provider.setLocale('fr')
    })
    expect(container.textContent).toContain('3 réponses')
    expect(container.textContent).not.toContain('3 responses')
  })
})
