// @vitest-environment jsdom
/**
 * Unit tests of `CookieBanner` — the port of
 * `@molecule/app-cookie-banner-react`'s own suite. The React suite renders the
 * component with mocked UI dependencies and asserts the markup; this port
 * mounts the same mocked tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same markup.
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

// Proxy ClassMap echoing each accessed member back as its token (e.g. `link`),
// so tests can assert which cm.* call was applied without a real bond — the
// same mock the React tests use.
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
        // `link` is a class TOKEN (a string in the UIClassMap), not a class
        // builder: Angular's `[class]` binding needs the very string React
        // renders for `className={cm.link}`.
        if (token === 'link') return token
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

// The i18n mock the React tests install for `@molecule/app-react`: `t`
// resolves to the inline English default.
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The `data-button` / `data-switch` markers the React tests mock
// `@molecule/app-ui-react` with: a button carrying its projected label and a
// checkbox carrying the `checked` state it received.
vi.mock('@molecule/app-ui-angular', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  const { Component } = await import('@angular/core')
  const MockButton = Component({
    selector: 'button[mol-button]',
    standalone: true,
    inputs: ['variant', 'color', 'size', 'disabled', 'style', 'testId', 'loading'],
    template: `<ng-content></ng-content>`,
  })(class ButtonStub {})
  const MockSwitch = Component({
    selector: 'mol-switch',
    standalone: true,
    inputs: ['checked', 'disabled'],
    template: `<input type="checkbox" data-switch="" [checked]="checked" readonly />`,
  })(class SwitchStub {})
  return { ...actual, Button: MockButton, Switch: MockSwitch }
})

const { CookieBanner } = await import('../cookie-banner.component.js')

/** A mounted spec host: its DOM and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts one standalone component through a JIT host template, written exactly
 * the way an Angular app would write it.
 *
 * @param template - The host template (the component element + projected content).
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function mount(template: string, props: Record<string, unknown> = {}): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [CookieBanner as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Default,
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

const mounted: Mounted[] = []

/** The banner's host template: every input bound from the props object. */
const TEMPLATE = `<div mol-cookie-banner [categories]="p['categories']" [onAcceptAll]="p['onAcceptAll']" [onRejectAll]="p['onRejectAll']" [onSave]="p['onSave']" [title]="p['title']" [description]="p['description']" [policyHref]="p['policyHref']" [visible]="p['visible']" [onDismiss]="p['onDismiss']" [className]="p['className']"></div>`

/**
 * Renders a `CookieBanner` with the given props and returns the mounted host.
 *
 * @param props - The banner's props.
 * @returns The mounted host.
 */
const render = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(TEMPLATE, props)
  mounted.push(m)
  return m
}

/** The banner's root element (the Angular host IS React's root `<div>`). */
const bannerEl = (host: HTMLElement): HTMLElement => {
  const el = host.querySelector<HTMLElement>('[mol-cookie-banner]')
  if (!el) throw new Error('no CookieBanner host rendered')
  return el
}

/** The granular categories: one required, one described, one without a description. */
const categories = [
  {
    id: 'essential',
    label: 'Essential',
    description: 'Required for the site to work.',
    required: true,
  },
  { id: 'analytics', label: 'Analytics', description: 'Helps us improve.' },
  { id: 'marketing', label: 'Marketing' },
]

/**
 * Renders the banner with the granular categories and its details list opened
 * (zoneless change detection settles asynchronously), returning the host.
 */
const renderOpen = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await render({ categories, ...props })
  bannerEl(m.host).querySelector<HTMLElement>('footer button')!.click()
  await vi.waitFor(() =>
    expect(bannerEl(m.host).querySelectorAll('input[data-switch]')).toHaveLength(3),
  )
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('CookieBanner', () => {
  it('renders nothing when visible is false', async () => {
    await render({ visible: false })
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  it('renders the default title and description', async () => {
    const m = await render({})
    expect(m.host.innerHTML).toContain('Cookie preferences')
    expect(m.host.innerHTML).toContain('improve your experience')
  })

  it('honours a custom title and description', async () => {
    const m = await render({ title: 'Cookies?', description: 'our own copy' })
    expect(m.host.innerHTML).toContain('Cookies?')
    expect(m.host.innerHTML).toContain('our own copy')
  })

  it('renders a "Learn more" policy link when policyHref is supplied', async () => {
    const m = await render({ policyHref: '/privacy' })
    expect(m.host.innerHTML).toContain('href="/privacy"')
    expect(m.host.innerHTML).toContain('Learn more')
  })

  it('always renders the accept and reject buttons', async () => {
    const m = await render({})
    expect(m.host.innerHTML).toContain('Accept all')
    expect(m.host.innerHTML).toContain('Reject all')
  })

  it('renders the customize button only when categories are supplied', async () => {
    const withCats = await render({ categories: [{ id: 'analytics', label: 'Analytics' }] })
    expect(withCats.host.innerHTML).toContain('Customize')
    const without = await render({})
    expect(without.host.innerHTML).not.toContain('Customize')
  })

  it('exposes a labelled dialog role and forwards className', async () => {
    const m = await render({ className: 'cbn-cls' })
    const el = bannerEl(m.host)
    expect(el.getAttribute('role')).toBe('dialog')
    expect(el.className.split(' ')).toContain('cbn-cls')
  })

  it('each category switch is named by its category label', async () => {
    const m = await renderOpen()
    const switches = [...bannerEl(m.host).querySelectorAll('mol-switch')]
    expect(switches).toHaveLength(3)
    const labels = ['Essential', 'Analytics', 'Marketing']
    for (const [index, label] of labels.entries()) {
      const namedBy = switches[index]!.getAttribute('aria-labelledby')
      expect(namedBy).toBeTruthy()
      expect(document.getElementById(namedBy!)?.textContent).toBe(label)
    }
  })

  it('each category switch is described by its category description', async () => {
    const m = await renderOpen()
    const switches = [...bannerEl(m.host).querySelectorAll('mol-switch')]
    expect(
      document.getElementById(switches[0]!.getAttribute('aria-describedby')!)?.textContent,
    ).toBe('Required for the site to work.')
    expect(
      document.getElementById(switches[1]!.getAttribute('aria-describedby')!)?.textContent,
    ).toBe('Helps us improve.')
    expect(switches[2]!.getAttribute('aria-describedby')).toBeNull()
  })

  it('the details button names the list and reflects its state', async () => {
    const m = await render({ categories })
    const details = bannerEl(m.host).querySelector<HTMLElement>('footer button')!
    expect(details.getAttribute('aria-expanded')).toBe('false')
    expect(details.getAttribute('aria-controls')).toBeNull()
    details.click()
    await vi.waitFor(() => expect(details.getAttribute('aria-expanded')).toBe('true'))
    const listId = details.getAttribute('aria-controls')
    expect(listId).toBeTruthy()
    const list = document.getElementById(listId!)
    expect(list?.classList.contains('stack')).toBe(true)
    expect(list?.querySelectorAll('input[data-switch]')).toHaveLength(3)
  })

  it('the details button drops the list reference when the details hide', async () => {
    const m = await renderOpen()
    const details = bannerEl(m.host).querySelector<HTMLElement>('footer button')!
    details.click()
    await vi.waitFor(() => expect(details.getAttribute('aria-expanded')).toBe('false'))
    expect(details.getAttribute('aria-controls')).toBeNull()
    expect(bannerEl(m.host).querySelectorAll('input[data-switch]')).toHaveLength(0)
  })
})
