// @vitest-environment jsdom
/**
 * The nav region's aria-label follows a locale switch — a port of
 * `@molecule/app-top-nav-layout-react/src/__tests__/top-nav-layout-locale-switch.test.tsx`:
 * the same test name and assertion. `useTranslation()` from
 * `@molecule/app-angular` subscribes the component to the bonded provider
 * through the signal its `t` reads, so after `setLocale('fr')` the label
 * re-renders in French. Against a hardcoded read default it stayed English —
 * the gap the conformance kit's pseudo-locale check records.
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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as AngularBinding from '@molecule/app-angular'
import { provideDomPlacement } from '@molecule/app-angular'
import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

vi.mock('@molecule/app-ui', () => {
  // The ClassMap members whose value is a class string (the rest are methods,
  // which the proxy answers as functions), so a token used as a class value
  // renders as it does under the bonded ClassMap.
  const tokens = new Set([
    'bgPrimaryContainer',
    'iconGlyphFont',
    'textMuted',
    'textPrimary',
    'topNavLayoutHeader',
    'topNavLayoutNavItem',
    'topNavLayoutNavItemIdle',
    'topNavLayoutNavItemLabel',
    'topNavLayoutRoot',
  ])
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
      if (tokens.has(token)) return token
      return (..._args: unknown[]) => token
    },
  }
  return { getClassMap: () => new Proxy({}, handler) }
})

// Only the router is mocked; the real `useTranslation` hook drives the switch,
// so the test holds the component's actual reactivity path.
vi.mock('@molecule/app-angular', async (importOriginal) => {
  const actual = await importOriginal<typeof AngularBinding>()
  const { Component, Directive } = await import('@angular/core')
  const Link = Directive({
    selector: 'a[molLink]',
    standalone: true,
    inputs: ['molLink'],
    host: { '[attr.href]': 'molLink', 'data-link': '' },
  })(
    class MockLink {
      /** The link's destination. */
      molLink = ''
    },
  )
  const RoutedView = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'mol-routed-view',
    standalone: true,
    template: '<div data-outlet=""></div>',
  })(
    class MockRoutedView {
      /** The routed view stub. */
      readonly stub = true
    },
  )
  return {
    ...actual,
    Link,
    RoutedView,
    useRouterInstance: () => ({
      getLocation: () => ({ pathname: '/', search: '', hash: '' }),
      subscribe: () => () => undefined,
    }),
  }
})

const { TopNavLayout } = await import('../top-nav-layout.component.js')

const navItems = [
  { to: '/dashboard', key: 'dashboard', label: 'Dashboard' },
  { to: '/reports', key: 'reports', label: 'Reports' },
]

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    {
      code: 'en',
      name: 'English',
      translations: { 'topNavLayout.aria.primaryNavigation': 'Primary navigation' },
    },
    {
      code: 'fr',
      name: 'French',
      translations: { 'topNavLayout.aria.primaryNavigation': 'Navigation principale' },
    },
  ])
  setProvider(provider)
})

const mounted: Array<{ destroy(): Promise<void> }> = []

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('TopNavLayout locale switch', () => {
  it("switching the provider's locale changes the nav region's aria-label", async () => {
    const Host = Component({
      selector: 'mol-spec-host',
      standalone: true,
      imports: [TopNavLayout as Type<unknown>],
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `<div mol-top-nav-layout [appName]="p['appName']" [navItems]="p['navItems']"></div>`,
    })(
      class SpecHost {
        /** The props the template binds. */
        p: Record<string, unknown> = { appName: 'Acme', navItems }
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
    mounted.push({
      destroy: async () => {
        appRef.destroy()
        host.remove()
      },
    })

    const nav = host.querySelector('nav')
    expect(nav?.getAttribute('aria-label')).toBe('Primary navigation')

    await provider.setLocale('fr')
    ref.changeDetectorRef.markForCheck()
    appRef.tick()

    expect(nav?.getAttribute('aria-label')).toBe('Navigation principale')
  })
})
