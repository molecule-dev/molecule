// @vitest-environment jsdom
/**
 * Locale-switch reactivity for `HeroMetricCard` / `HeroMetricTrendChip` labels —
 * a port of
 * `@molecule/app-hero-metric-card-react/src/__tests__/hero-metric-card-locale-switch.test.tsx`:
 * the same test names and assertions. A static `t` reads the bonded provider
 * but nothing subscribes the calling component to locale changes, so after
 * `setLocale('fr')` its labels stayed in the old language. `useTranslation()`
 * from `@molecule/app-svelte` tracks the provider's notifications, so the
 * templates re-render on the switch. These tests bond a provider with an `en`
 * and a `fr` value for a key each component renders, render it in `en`, switch
 * to `fr`, and assert the DOM now shows the French value.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { type Component, type ComponentProps, flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import HeroMetricCard from '../HeroMetricCard.svelte'
import HeroMetricTrendChip from '../HeroMetricTrendChip.svelte'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the components' `t` resolves against. */
let provider: I18nProvider
/** The mounted instances, torn down after each test. */
const instances: unknown[] = []

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

afterEach(async () => {
  for (const instance of instances.splice(0))
    await unmount(instance as Parameters<typeof unmount>[0])
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

/** A Svelte component whose props are a plain record, as `ComponentProps` accepts it. */
type MountedComponent = Component<Record<string, unknown>, Record<string, unknown>>

/**
 * Mounts a component and returns its rendered root element.
 *
 * @param component - The component to mount.
 * @param props - Its props.
 * @returns The element holding the component's DOM.
 */
function render<C extends MountedComponent>(component: C, props: ComponentProps<C>): HTMLElement {
  const target = document.createElement('div')
  document.body.appendChild(target)
  instances.push(mount(component, { target, props }))
  flushSync()
  return target
}

describe('hero-metric-card locale switch', () => {
  it('HeroMetricCard renders the loading label in French after setLocale', async () => {
    const host = render(HeroMetricCard, { title: 'Steps', value: '9,420', loading: true })
    expect(host.textContent).toContain('Loading metric…')

    // The switch itself: the card must re-render in French. Against the
    // static `t` this stays English — nothing subscribed it to the provider.
    await provider.setLocale('fr')
    flushSync()
    expect(host.textContent).toContain('Chargement de la métrique…')
    expect(host.textContent).not.toContain('Loading metric…')
  })

  it('HeroMetricTrendChip renders the trend aria-label in French after setLocale', async () => {
    const host = render(HeroMetricTrendChip, { trend: { direction: 'up', delta: '+12%' } })
    expect(host.querySelector('[aria-label="Trending up"]')).not.toBeNull()

    // The switch itself: the chip must re-render in French. Against the
    // static `t` this stays English — nothing subscribed it to the provider.
    await provider.setLocale('fr')
    flushSync()
    expect(host.querySelector('[aria-label="En hausse"]')).not.toBeNull()
    expect(host.querySelector('[aria-label="Trending up"]')).toBeNull()
  })
})
