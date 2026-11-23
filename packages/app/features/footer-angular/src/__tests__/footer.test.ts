// @vitest-environment jsdom
/**
 * Unit tests of `AppFooter` — the port of `@molecule/app-footer-react`'s own
 * suite. The React suite renders the component with mocked UI dependencies
 * (`renderToStaticMarkup`); this port mounts the same mocked tree through
 * Angular's real renderer (the `createApplication` + JIT host approach the
 * conformance kit's Angular adapter uses) and asserts the same observable
 * markup through the mounted DOM.
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
  EventEmitter,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type * as AngularBinding from '@molecule/app-angular'
import { provideDomPlacement } from '@molecule/app-angular'
import { createMemoryRouter, type Router } from '@molecule/app-routing'

// Proxy ClassMap echoing each accessed member back as its token (e.g. `footerBar`),
// so tests can assert which cm.* class was applied without a real bond.
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

// The UI components AppFooter composes, each rendering one marked element —
// the same observable contracts the React suite's mocks have (Icon →
// `data-icon`; Modal → a `data-modal` div only while open).
vi.mock('@molecule/app-ui-angular', async () => {
  const { Component } = await import('@angular/core')
  return {
    Icon: Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'svg[mol-icon-root]',
      standalone: true,
      inputs: ['name', 'size', 'className', 'ariaHidden: aria-hidden'],
      host: { '[attr.data-icon]': 'name' },
      template: '',
    })(
      class MockIcon {
        /** The glyph name. */
        name?: string
        /** The pixel size. */
        size?: number
        /** Extra classes. */
        className?: string
      },
    ),
    Modal: Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'mol-modal',
      standalone: true,
      inputs: ['open', 'title', 'size'],
      outputs: ['close'],
      template: `@if (open) {<div data-modal=""><ng-content></ng-content></div>}`,
    })(
      class MockModal {
        /** Whether the dialog is open. */
        open?: boolean
        /** The dialog title. */
        title?: string
        /** Dialog width preset. */
        size?: string
        /** Fires when the dialog asks to close. */
        readonly close = new EventEmitter<unknown>()
      },
    ),
  }
})

// Real hooks mocked at the binding boundary, the same observable contracts the
// React suite's `@molecule/app-react` mock has (fixed locale list, version
// 2.0.0; `t()` resolves the inline defaultValue).
// The internal links are the binding's real `Link` directive over a real memory router.
vi.mock('@molecule/app-angular', async (importOriginal) => {
  const actual = await importOriginal<typeof AngularBinding>()
  const { signal } = await import('@angular/core')
  const locale = signal('en')
  return {
    ...actual,
    useTranslation: () => ({
      t: (
        key: string,
        values: Record<string, unknown> | undefined,
        opts?: { defaultValue?: string },
      ) => {
        let out = opts?.defaultValue ?? key
        if (values)
          for (const [k, v] of Object.entries(values)) out = out.replace(`{{${k}}}`, String(v))
        return out
      },
      locale,
      setLocale: async (): Promise<void> => {
        locale.set('es')
      },
      locales: signal([
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Español' },
      ]),
    }),
    useVersion: () => ({ state: signal({ version: '2.0.0' }) }),
  }
})

const { AppFooter } = await import('../index.js')
const { provideRouter } = await import('@molecule/app-angular')

/** The host template for one AppFooter render: every React prop is bound. */
const footerTemplate = `<mol-app-footer
  [appName]="p['appName']"
  [aboutHref]="p['aboutHref']"
  [legalMode]="p['legalMode']"
  [loadContent]="p['loadContent']"
  [privacyTo]="p['privacyTo']"
  [termsTo]="p['termsTo']"
  [className]="p['className']"
  [dataMolId]="p['dataMolId']"
></mol-app-footer>`

/** A mounted spec host: its DOM, its memory router and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** The memory router the footer's `Link` anchors navigate. */
  readonly router: Router
  /** Runs change detection to settle a click's updates. */
  flush(): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template, written
 * exactly the way an Angular app would write it.
 *
 * @param template - The host template.
 * @param component - The component class under test.
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(
  template: string,
  component: Type<unknown>,
  props: Record<string, unknown> = {},
): Promise<Mounted> {
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
  const router: Router = createMemoryRouter({ initialEntries: ['/'] })
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement(), provideRouter(router)],
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
    router,
    flush: async () => {
      appRef.tick()
      await Promise.resolve()
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

const mounted: Mounted[] = []

/**
 * Renders AppFooter with the given props, once per call, tracked for teardown.
 *
 * @param props - The props to bind.
 * @returns The mounted host.
 */
async function renderFooter(props: Record<string, unknown> = {}): Promise<Mounted> {
  const m = await mount(footerTemplate, AppFooter as Type<unknown>, props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

/**
 * Mounts AppFooter between two fixed siblings, the way a consumer list would,
 * and returns a setter for its inputs.
 *
 * @param legalMode - The initial legal surface mode.
 * @returns The mounted host and a setter that re-renders with new props.
 */
async function renderInList(
  legalMode: 'modal' | 'route',
): Promise<Mounted & { set(next: Record<string, unknown>): void }> {
  const Host = Component({
    selector: 'mol-spec-list-host',
    standalone: true,
    imports: [AppFooter as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<i>a</i><mol-app-footer [appName]="p['appName']" [aboutHref]="p['aboutHref']" [legalMode]="p['legalMode']"></mol-app-footer><i>b</i>`,
  })(
    class SpecListHost {
      /** The props the template binds. */
      p: Record<string, unknown> = { appName: 'Acme', aboutHref: '/about', legalMode }
    },
  )
  const router: Router = createMemoryRouter({ initialEntries: ['/'] })
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement(), provideRouter(router)],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  const entry: Mounted = {
    host,
    router,
    flush: async () => {
      appRef.tick()
      await Promise.resolve()
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
  mounted.push(entry)
  return {
    ...entry,
    set: (next) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
  }
}

describe('AppFooter', () => {
  it('renders the About link with the interpolated app name', async () => {
    const m = await renderFooter({ appName: 'Acme', aboutHref: '/about' })
    expect(m.host.textContent).toContain('About Acme')
  })

  it('renders an external About href as a target=_blank anchor', async () => {
    const m = await renderFooter({ appName: 'Acme', aboutHref: 'https://acme.com' })
    const about = m.host.querySelector<HTMLAnchorElement>('a[href="https://acme.com"]')
    if (!about) throw new Error('no external About anchor rendered')
    expect(about.getAttribute('target')).toBe('_blank')
    expect(about.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('renders an internal About href as a router Link', async () => {
    const m = await renderFooter({ appName: 'Acme', aboutHref: '/about' })
    const about = m.host.querySelector<HTMLAnchorElement>('a[href="/about"]')
    if (!about) throw new Error('no internal About anchor rendered')
    // React asserts the mocked react-router Link's `data-link` marker; the
    // Angular binding's real `Link` directive leaves no DOM attribute, so the
    // same behavior is asserted the conformance kit's way: the anchor's click
    // is taken in-app by the router (prevented from the browser) instead of
    // being left to a plain anchor's navigation.
    let prevented: boolean | undefined
    const observe = (event: Event): void => {
      prevented = event.defaultPrevented
    }
    window.addEventListener('click', observe)
    try {
      about.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    } finally {
      window.removeEventListener('click', observe)
    }
    expect(prevented).toBe(true)
    await m.flush()
    const location = m.router.getLocation()
    expect(location.pathname + location.search + location.hash).toBe('/about')
  })

  it('renders an internal About href as an in-app anchor without a target', async () => {
    const m = await renderFooter({ appName: 'Acme', aboutHref: '/about' })
    const about = m.host.querySelector<HTMLAnchorElement>('a[href="/about"]')
    if (!about) throw new Error('no internal About anchor rendered')
    // The internal branch carries no `target` (React renders a router <Link>).
    expect(about.getAttribute('target')).toBeNull()
  })

  it('renders Privacy/Terms as buttons in modal mode', async () => {
    const m = await renderFooter({ appName: 'Acme', aboutHref: '/about' })
    const buttons = [...m.host.querySelectorAll('footer button')].map(
      (button) => button.textContent?.trim() ?? '',
    )
    expect(buttons).toContain('Privacy Policy')
    expect(buttons).toContain('Terms of Service')
  })

  it('renders Privacy/Terms as router Links in route mode', async () => {
    const m = await renderFooter({ appName: 'Acme', aboutHref: '/about', legalMode: 'route' })
    expect(m.host.querySelector('a[href="/privacy"]')?.textContent?.trim()).toBe('Privacy Policy')
    expect(m.host.querySelector('a[href="/terms"]')?.textContent?.trim()).toBe('Terms of Service')
  })

  it('renders the language button and the version string', async () => {
    const m = await renderFooter({ appName: 'Acme', aboutHref: '/about' })
    expect(m.host.querySelector('[data-icon="globe"]')).not.toBeNull()
    expect(m.host.textContent).toContain('English')
    expect(m.host.textContent).toContain('v2.0.0')
  })

  it('keeps the privacy/terms modals closed initially', async () => {
    const m = await renderFooter({ appName: 'Acme', aboutHref: '/about' })
    expect(m.host.querySelector('[data-modal]')).toBeNull()
  })

  it('sets data-mol-id and forwards className', async () => {
    const m = await renderFooter({
      appName: 'Acme',
      aboutHref: '/about',
      dataMolId: 'footer-x',
      className: 'ft-cls',
    })
    const footer = m.host.querySelector('footer')
    if (!footer) throw new Error('no <footer> rendered')
    expect(footer.getAttribute('data-mol-id')).toBe('footer-x')
    expect(footer.getAttribute('class')).toContain('ft-cls')
  })

  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await renderInList('modal')
    const children = (): string[] =>
      Array.from(m.host.children).map((child) => child.tagName.toLowerCase())
    expect(children()).toEqual(['i', 'footer', 'mol-modal', 'mol-modal', 'mol-modal', 'i'])
    m.set({ legalMode: 'route' })
    expect(children()).toEqual(['i', 'footer', 'mol-modal', 'i'])
  })
})
