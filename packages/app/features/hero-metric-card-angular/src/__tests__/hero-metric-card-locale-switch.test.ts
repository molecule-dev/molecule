// @vitest-environment jsdom
/**
 * Locale-switch reactivity for `HeroMetricCard` / `HeroMetricTrendChip` labels —
 * a port of
 * `@molecule/app-hero-metric-card-react/src/__tests__/hero-metric-card-locale-switch.test.tsx`:
 * the same test names and assertions. A static `t` reads the bonded provider
 * but nothing subscribes the calling component to locale changes, so after
 * `setLocale('fr')` its labels stayed in the old language. `useTranslation()`
 * from `@molecule/app-angular` reads the provider's notifications signal, so
 * the templates re-render on the switch. These tests bond a provider with an
 * `en` and a `fr` value for a key each component renders, render it in `en`,
 * switch to `fr`, flush change detection, and assert the DOM now shows the
 * French value.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'
import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { HeroMetricCard } from '../hero-metric-card.component.js'
import { HeroMetricTrendChip } from '../hero-metric-trend-chip.component.js'

/** A mounted spec host: its DOM, a flush and a teardown. */
interface Mounted {
  /** The host element holding the rendered component. */
  readonly host: HTMLElement
  /** Flushes change detection (after a locale switch, say). */
  flush(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template.
 *
 * @param component - The component class under test.
 * @param hostTemplate - The host template.
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(
  component: Type<unknown>,
  hostTemplate: string,
  props: Record<string, unknown> = {},
): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: hostTemplate,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return {
    host,
    flush: () => appRef.tick(),
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

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

describe('hero-metric-card locale switch', () => {
  it('HeroMetricCard renders the loading label in French after setLocale', async () => {
    const m = await mount(
      HeroMetricCard as Type<unknown>,
      `<div mol-hero-metric-card [title]="p['title']" [value]="p['value']" [loading]="p['loading']"></div>`,
      { title: 'Steps', value: '9,420', loading: true },
    )
    expect(m.host.textContent).toContain('Loading metric…')

    // The switch itself: the card must re-render in French. Against the
    // static `t` this stays English — nothing subscribed it to the provider.
    await provider.setLocale('fr')
    m.flush()
    expect(m.host.textContent).toContain('Chargement de la métrique…')
    expect(m.host.textContent).not.toContain('Loading metric…')
    await m.destroy()
  })

  it('HeroMetricTrendChip renders the trend aria-label in French after setLocale', async () => {
    const m = await mount(
      HeroMetricTrendChip as Type<unknown>,
      `<span mol-hero-metric-trend-chip [trend]="p['trend']"></span>`,
      { trend: { direction: 'up', delta: '+12%' } },
    )
    expect(m.host.querySelector('[aria-label="Trending up"]')).not.toBeNull()

    // The switch itself: the chip must re-render in French. Against the
    // static `t` this stays English — nothing subscribed it to the provider.
    await provider.setLocale('fr')
    m.flush()
    expect(m.host.querySelector('[aria-label="En hausse"]')).not.toBeNull()
    expect(m.host.querySelector('[aria-label="Trending up"]')).toBeNull()
    await m.destroy()
  })
})
