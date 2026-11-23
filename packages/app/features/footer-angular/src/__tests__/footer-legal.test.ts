// @vitest-environment jsdom
/**
 * Unit tests of `AppFooter`'s legal modals — the port of
 * `@molecule/app-footer-react`'s legal suite: the no-silently-blank-modal
 * placeholder, the HTML-escaped app name, and app-registered HTML rendering.
 * The React suite renders with mocked UI dependencies and a mutable i18n
 * catalog; this port mounts the same mocked tree through Angular's real
 * renderer and seeds the same catalog.
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
import { createMemoryRouter } from '@molecule/app-routing'

// A mutable i18n catalog the tests can seed to simulate an app that registered
// real legal HTML. Hoisted so the `vi.mock` factories below can reference it.
const { catalog } = vi.hoisted(() => ({ catalog: {} as Record<string, string> }))

// Proxy ClassMap echoing each accessed member back as its token (e.g. `prose`),
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
    // Render children only when open, like the real Modal — so a closed modal
    // has no body and an opened one exposes exactly what the footer put in it.
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

// `t()` consults the seeded catalog first, then the inline defaultValue — the
// same resolution order the real i18n provider uses (bond value → fallback).
// The internal links are the binding's real `Link` directive over a real memory router.
vi.mock('@molecule/app-angular', async (importOriginal) => {
  const actual = await importOriginal<typeof AngularBinding>()
  const { signal } = await import('@angular/core')
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) => {
        let out = key in catalog ? catalog[key] : (opts?.defaultValue ?? key)
        if (values)
          for (const [k, v] of Object.entries(values)) out = out.replaceAll(`{{${k}}}`, String(v))
        return out
      },
      locale: signal('en'),
      setLocale: async (): Promise<void> => {},
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

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
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
  const appRef: ApplicationRef = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      provideDomPlacement(),
      provideRouter(createMemoryRouter({ initialEntries: ['/'] })),
    ],
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
 * Opens the Privacy or Terms modal and returns the rendered modal element.
 *
 * @param label - The button text to click ('Privacy Policy' or 'Terms of Service').
 * @param appName - The app name to render the footer with.
 * @returns The mounted host and the open modal element.
 */
async function openLegalModal(
  label: 'Privacy Policy' | 'Terms of Service',
  appName = 'Acme',
): Promise<{ mounted: Mounted; modal: HTMLElement }> {
  const m = await mount(footerTemplate, AppFooter as Type<unknown>, {
    appName,
    aboutHref: '/about',
  })
  mounted.push(m)
  const button = [...m.host.querySelectorAll<HTMLButtonElement>('footer button')].find(
    (candidate) => candidate.textContent?.trim() === label,
  )
  if (!button) throw new Error(`${label} button did not render`)
  button.click()
  await m.flush()
  const modal = m.host.querySelector<HTMLElement>('[data-modal]')
  if (!modal) throw new Error(`${label} modal did not open`)
  return { mounted: m, modal }
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  for (const k of Object.keys(catalog)) delete catalog[k]
})

describe('AppFooter legal modals — no silently-blank modal (empty content)', () => {
  it('shows the honest placeholder in the Privacy modal when content is empty', async () => {
    const { modal } = await openLegalModal('Privacy Policy')
    // The modal is not blank — it carries the configured-placeholder message.
    expect(modal.textContent).toContain('This content has not been configured yet')
    expect(modal.textContent).toContain('app owner must provide it')
    expect((modal.textContent ?? '').trim().length).toBeGreaterThan(0)
    // Placeholder branch renders the message as plain text in a <p> — NOT an
    // injected-HTML <div> (which would be blank when content is empty).
    expect(modal.firstElementChild?.tagName).toBe('P')
  })

  it('shows the honest placeholder in the Terms modal when content is empty', async () => {
    const { modal } = await openLegalModal('Terms of Service')
    expect(modal.textContent).toContain('This content has not been configured yet')
    expect(modal.firstElementChild?.tagName).toBe('P')
  })
})

describe('AppFooter legal modals — {{appName}} is HTML-escaped before entering legal HTML', () => {
  it('a markup-carrying appName renders inert, not as script/img tags', async () => {
    catalog['content.privacyPolicy'] = '<p>Privacy Policy for {{appName}}.</p>'
    const { modal } = await openLegalModal(
      'Privacy Policy',
      'Acme<img src=x onerror=alert(1)><script>evil()</script>',
    )
    const html = modal.firstElementChild!.innerHTML
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&lt;img')
    // No live script/img element was created from the appName.
    expect(modal.querySelector('script')).toBeNull()
    expect(modal.querySelector('img')).toBeNull()
  })
})

describe('AppFooter legal modals — app-registered content renders as HTML', () => {
  it('renders registered privacy HTML instead of the placeholder', async () => {
    catalog['content.privacyPolicy'] = '<h2>Acme Privacy</h2><p>We collect nothing.</p>'
    const { modal } = await openLegalModal('Privacy Policy')
    // Registered content branch renders the raw HTML inside a <div>.
    expect(modal.firstElementChild?.tagName).toBe('DIV')
    expect(modal.firstElementChild?.innerHTML).toContain('<h2>Acme Privacy</h2>')
    // The placeholder must NOT appear once real content exists.
    expect(modal.textContent).not.toContain('has not been configured yet')
  })

  it('interpolates {{appName}} into registered terms HTML', async () => {
    catalog['content.termsOfService'] = '<p>These terms govern {{appName}}.</p>'
    const { modal } = await openLegalModal('Terms of Service')
    expect(modal.firstElementChild?.tagName).toBe('DIV')
    expect(modal.firstElementChild?.innerHTML).toContain('These terms govern Acme.')
    expect(modal.textContent).not.toContain('has not been configured yet')
  })
})
