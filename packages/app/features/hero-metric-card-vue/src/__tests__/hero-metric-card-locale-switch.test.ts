// @vitest-environment jsdom
/**
 * Locale-switch reactivity for the Vue `HeroMetricCard` / `HeroMetricTrendChip`
 * labels — a port of
 * `@molecule/app-hero-metric-card-react/src/__tests__/hero-metric-card-locale-switch.test.tsx`:
 * the same test names and assertions. A static `t` reads the bonded provider
 * but nothing subscribes the calling component to locale changes, so after
 * `setLocale('fr')` its labels stayed in the old language. `useTranslation()`
 * from `@molecule/app-vue` subscribes to the provider, so the components
 * re-render on the switch. These tests bond a provider with an `en` and a `fr`
 * value for a key each component renders, render it in `en`, switch to `fr`,
 * and assert the DOM now shows the French value.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createApp, defineComponent, h, nextTick } from 'vue'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { HeroMetricCard } from '../HeroMetricCard.js'
import { HeroMetricTrendChip } from '../HeroMetricTrendChip.js'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the components' `t` resolves against. */
let provider: I18nProvider

beforeEach(() => {
  setClassMap(classMap)
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
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

/** The mounted host and its teardown. */
interface Mounted {
  /** The host element holding the rendered component. */
  host: HTMLElement
  /** Unmounts the app and removes the host. */
  unmount(): void
}

/**
 * Mounts a component and returns its host.
 *
 * @param component - The component to mount.
 * @param props - Its props.
 * @returns The mounted host and a teardown.
 */
const mount = (component: Parameters<typeof h>[0], props: Record<string, unknown>): Mounted => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(component, props) }))
  app.mount(host)
  return { host, unmount: () => app.unmount() }
}

describe('hero-metric-card locale switch', () => {
  it('HeroMetricCard renders the loading label in French after setLocale', async () => {
    const { host, unmount } = mount(HeroMetricCard, {
      title: 'Steps',
      value: '9,420',
      loading: true,
    })
    expect(host.textContent).toContain('Loading metric…')

    // The switch itself: the card must re-render in French. Against the
    // static `t` this stays English — nothing subscribed it to the provider.
    await provider.setLocale('fr')
    await nextTick()
    expect(host.textContent).toContain('Chargement de la métrique…')
    expect(host.textContent).not.toContain('Loading metric…')
    unmount()
  })

  it('HeroMetricTrendChip renders the trend aria-label in French after setLocale', async () => {
    const { host, unmount } = mount(HeroMetricTrendChip, {
      trend: { direction: 'up', delta: '+12%' },
    })
    expect(host.querySelector('[aria-label="Trending up"]')).not.toBeNull()

    // The switch itself: the chip must re-render in French. Against the
    // static `t` this stays English — nothing subscribed it to the provider.
    await provider.setLocale('fr')
    await nextTick()
    expect(host.querySelector('[aria-label="En hausse"]')).not.toBeNull()
    expect(host.querySelector('[aria-label="Trending up"]')).toBeNull()
    unmount()
  })
})
