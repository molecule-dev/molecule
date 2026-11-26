// @vitest-environment jsdom
/**
 * The Angular `TopNavLayout`'s own text goes through i18n — a port of
 * `@molecule/app-top-nav-layout-react/src/__tests__/top-nav-layout-i18n.test.tsx`:
 * the same behavioral assertions, mounted through Angular's real renderer.
 * With a provider whose `t` marks every translated string, the nav region's
 * `aria-label` renders under its key — a plain-English read default would
 * bypass `t()` — and an explicit `navAriaLabel` input still overrides it.
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
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `topNavLayoutRoot`), so tests can assert which cm.* class was applied
// without a real bond — the same mock the React tests use. The ClassMap
// members whose value is a class string (the rest are methods, which the
// proxy answers as functions) render as they do under the bonded ClassMap.
vi.mock('@molecule/app-ui', async (importOriginal) => {
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
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    getClassMap: () => new Proxy({}, handler),
  }
})

// The router markers the React tests mock `react-router` with, plus a
// translation function that marks every key, so a default that bypassed `t()`
// would show up as plain English.
vi.mock('@molecule/app-angular', async (importOriginal) => {
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
    ...(await importOriginal<Record<string, unknown>>()),
    Link,
    RoutedView,
    useRouterInstance: () => ({
      getLocation: () => ({ pathname: '/', search: '', hash: '' }),
      subscribe: () => () => undefined,
    }),
    useTranslation: () => ({ t: (key: string) => `«${key}»` }),
  }
})

const { TopNavLayout } = await import('../top-nav-layout.component.js')

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param template - The host template (the component element + projected content).
 * @param component - The component class under test.
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(
  template: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<{ host: HTMLElement; destroy(): Promise<void> }> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [component],
    changeDetection: ChangeDetectionStrategy.Eager,
    template,
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
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Array<{ destroy(): Promise<void> }> = []

const navItems = [
  { to: '/dashboard', key: 'dashboard', label: 'Dashboard' },
  { to: '/reports', key: 'reports', label: 'Reports' },
]

/** The host template every case renders, with the props object's bindings. */
const template = (content = ''): string =>
  `<div mol-top-nav-layout [appName]="p['appName']" [navItems]="p['navItems']" [navAriaLabel]="p['navAriaLabel']">${content}</div>`

const render = async (props: Record<string, unknown> = {}): Promise<string> => {
  const m = await mount(template(), TopNavLayout as Type<unknown>, { navItems, ...props })
  mounted.push(m)
  return m.host.innerHTML
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('TopNavLayout i18n', () => {
  it('labels the nav region through t with its key', async () => {
    const markup = await render({ appName: 'Acme' })
    expect(markup).toContain('aria-label="«topNavLayout.aria.primaryNavigation»"')
    expect(markup).not.toContain('aria-label="Primary navigation"')
  })

  it('an explicit navAriaLabel prop overrides the translated default', async () => {
    const markup = await render({ appName: 'Acme', navAriaLabel: 'Top nav' })
    expect(markup).toContain('aria-label="Top nav"')
    expect(markup).not.toContain('«topNavLayout.aria.primaryNavigation»')
  })
})
