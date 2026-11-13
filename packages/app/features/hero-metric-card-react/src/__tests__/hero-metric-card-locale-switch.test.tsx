/**
 * Locale-switch reactivity for HeroMetricCard + HeroMetricTrendChip labels.
 *
 * The static `import { t } from '@molecule/app-i18n'` reads the bonded
 * provider but nothing subscribes the calling component to locale changes, so
 * after `setLocale('fr')` its labels stayed in the old language until an
 * unrelated re-render happened to redraw them. `useTranslation()` from
 * `@molecule/app-react` subscribes through `useSyncExternalStore`, so a
 * component reading `t` from the hook re-renders on the switch. These tests
 * bond a provider with an `en` and a `fr` value for a key each component
 * renders, render it in `en`, switch to `fr` through `act`, and assert the
 * DOM now shows the French value.
 *
 * @module
 */

import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import { HeroMetricCard } from '../HeroMetricCard.js'
import { HeroMetricTrendChip } from '../HeroMetricTrendChip.js'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the components' `t` resolves against. */
let provider: I18nProvider

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    {
      code: 'en',
      name: 'English',
      translations: {
        'hero-metric-card.loading': 'Loading metric…',
        'hero-metric-card.trend.up': 'Trending up',
      },
    },
    {
      code: 'fr',
      name: 'French',
      translations: {
        'hero-metric-card.loading': 'Chargement de la métrique…',
        'hero-metric-card.trend.up': 'En hausse',
      },
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

describe('hero-metric-card locale switch', () => {
  it('HeroMetricCard renders the loading label in French after setLocale', async () => {
    const { container } = render(<HeroMetricCard title="Steps" value="9,420" loading />)
    expect(container.textContent).toContain('Loading metric…')

    // The switch itself: the card must re-render in French. Against the
    // static `t` this stays English — nothing subscribed it to the provider.
    await act(async () => {
      await provider.setLocale('fr')
    })
    expect(container.textContent).toContain('Chargement de la métrique…')
    expect(container.textContent).not.toContain('Loading metric…')
  })

  it('HeroMetricTrendChip renders the trend aria-label in French after setLocale', async () => {
    const { container } = render(<HeroMetricTrendChip trend={{ direction: 'up', delta: '+12%' }} />)
    expect(container.querySelector('[aria-label="Trending up"]')).not.toBeNull()

    // The switch itself: the chip must re-render in French. Against the
    // static `t` this stays English — nothing subscribed it to the provider.
    await act(async () => {
      await provider.setLocale('fr')
    })
    expect(container.querySelector('[aria-label="En hausse"]')).not.toBeNull()
    expect(container.querySelector('[aria-label="Trending up"]')).toBeNull()
  })
})
