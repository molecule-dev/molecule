// @vitest-environment jsdom
/**
 * i18n tests of the Angular sidebar layout — the port of
 * `@molecule/app-sidebar-layout-react/src/__tests__/sidebar-layout-i18n.test.tsx`:
 * the same test names and assertions, mounted through Angular's real renderer
 * (the same `createApplication` + JIT host approach the suite uses). A provider
 * whose `t` marks every string proves a default that bypassed `t()`; a real
 * `en`/`de` provider proves the label follows a locale switch.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token — the same
// mock the Angular suite uses.
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

// The router markers the Angular suite mocks, spread over the binding's real
// exports so `useTranslation` is the one the component actually uses.
vi.mock('@molecule/app-angular', async (importOriginal) => {
  const actual = await importOriginal<typeof AngularBinding>()
  const { Directive } = await import('@angular/core')
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
  return {
    ...actual,
    Link,
    useRouterInstance: () => ({
      getLocation: () => ({ pathname: '/dashboard', search: '', hash: '' }),
      subscribe: () => () => undefined,
    }),
  }
})

import type * as AngularBinding from '@molecule/app-angular'
import { createSimpleI18nProvider, type I18nProvider, setProvider } from '@molecule/app-i18n'

const { SidebarLayout } = await import('../sidebar-layout.component.js')

/** The English values the real provider of the switch test carries. */
const EN = {
  'sidebarLayout.aria.primaryNavigation': 'Primary navigation',
}

/** The German values the real provider of the switch test carries. */
const DE = {
  'sidebarLayout.aria.primaryNavigation': 'Hauptnavigation',
}

/** The real `en`/`de` provider, set inside the switch test. */
let locales: I18nProvider

beforeEach(() => {
  // A provider whose `t` marks every string with its key, so a default that
  // bypassed t() would show up as plain English.
  setProvider({
    ...createSimpleI18nProvider('en'),
    t: (key) => `«en:${key}»`,
  })
})

afterEach(() => {
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

/** The one plain nav item every test renders. */
const navItems = [{ to: '/dashboard', key: 'dashboard', label: 'Dashboard' }]

/** A mounted spec host: its DOM, a change-detection tick and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Runs one change-detection pass over the mounted app. */
  tick(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

const mounted: Mounted[] = []

/**
 * Mounts the sidebar through a JIT host template, written exactly the way an
 * Angular app would write it.
 *
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function render(props: Record<string, unknown> = {}): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [SidebarLayout as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Default,
    template: `<div mol-sidebar-layout [appName]="p['appName']" [navItems]="p['navItems']" [navAriaLabel]="p['navAriaLabel']"></div>`,
  })(
    class SpecHost {
      /** The inputs the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
  })
  const ref = createComponent(Host, { environmentInjector: appRef.injector })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  const view: Mounted = {
    host,
    tick: () => appRef.tick(),
    destroy: async () => {
      ref.destroy()
      host.remove()
      await appRef.destroy()
    },
  }
  mounted.push(view)
  return view
}

afterEach(async () => {
  for (const view of mounted.splice(0)) await view.destroy()
})

describe('SidebarLayout i18n', () => {
  it('takes the nav region label through t with its key', async () => {
    const { host } = await render({ appName: 'Acme', navItems })
    const nav = host.querySelector('nav')
    expect(nav?.getAttribute('aria-label')).toBe('«en:sidebarLayout.aria.primaryNavigation»')
  })

  it('lets an explicit navAriaLabel prop override the translated default', async () => {
    const { host } = await render({ appName: 'Acme', navItems, navAriaLabel: 'Nav override' })
    const nav = host.querySelector('nav')
    expect(nav?.getAttribute('aria-label')).toBe('Nav override')
    expect(nav?.getAttribute('aria-label')).not.toContain('«')
  })

  it('renders the nav label in the locale the provider switches to', async () => {
    locales = createSimpleI18nProvider('en', [
      { code: 'en', name: 'English', translations: EN },
      { code: 'de', name: 'German', translations: DE },
    ])
    setProvider(locales)

    const view = await render({ appName: 'Acme', navItems })
    const nav = view.host.querySelector('nav')
    expect(nav?.getAttribute('aria-label')).toBe('Primary navigation')

    // The switch itself: the label must re-render in German. Against the old
    // hardcoded attribute this stayed English — nothing subscribed it.
    await locales.setLocale('de')
    view.tick()
    expect(nav?.getAttribute('aria-label')).toBe('Hauptnavigation')
  })
})
