// @vitest-environment jsdom
/**
 * Unit tests of `HelpButton` — the port of
 * `@molecule/app-help-button-react`'s own suite. The React suite renders the
 * component with mocked UI dependencies and asserts the markup; this port
 * mounts the same mocked tree through Angular's real renderer (the same
 * `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses) and asserts the same markup strings.
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

// Proxy ClassMap echoing each accessed member back as its token, so tests can
// assert which cm.* class was applied without a real bond.
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

vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { HelpButton } = await import('../help-button.component.js')

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

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
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  appRef.tick()
  return {
    host,
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
}

/** The host template for a {@link HelpButton} without projected icon content. */
const bare = `<div mol-help-button [label]="p['label']" [onClick]="p['onClick']" [href]="p['href']" [size]="p['size']" [position]="p['position']" [hasNotification]="p['hasNotification']" [className]="p['className']"></div>`

/** The host template with a `[slot=icon]` projection. */
const withIcon = `<div mol-help-button [label]="p['label']" [onClick]="p['onClick']" [href]="p['href']" [size]="p['size']" [position]="p['position']" [hasNotification]="p['hasNotification']" [className]="p['className']"><span slot="icon" data-icon></span></div>`

const mounted: Mounted[] = []

const render = async (template: string, props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(template, HelpButton as Type<unknown>, props)
  mounted.push(m)
  return m
}

/** The rendered root element of the button/anchor. */
const root = (host: HTMLElement): HTMLElement => {
  const el = host.querySelector('button, a')
  if (!(el instanceof HTMLElement)) throw new Error('no HelpButton root rendered')
  return el
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('HelpButton', () => {
  it('keeps a consumer list in order when an item is inserted in the middle of icon', async () => {
    const m = await render(
      `<div mol-help-button [label]="p['label']">@for (x of p['xs']; track x) {<span slot="icon"><b>{{ x }}</b></span>}</div>`,
      { label: 'Help', xs: [1, 3] },
    )
    const texts = (): string[] =>
      Array.from(m.host.querySelectorAll('button b, a b')).map((el) => el.textContent ?? '')
    expect(texts()).toEqual(['1', '3'])
    await m.setProps({ xs: [1, 2, 3] })
    expect(texts()).toEqual(['1', '2', '3'])
    await m.setProps({ xs: [1, 3] })
    expect(texts()).toEqual(['1', '3'])
  })

  it('renders a <button> when no href is supplied', async () => {
    const m = await render(bare, { onClick: () => {} })
    expect(root(m.host).tagName).toBe('BUTTON')
  })

  it('renders an <a> when href is supplied', async () => {
    const m = await render(bare, { href: '/support' })
    expect(root(m.host).tagName).toBe('A')
    expect(root(m.host).getAttribute('href')).toBe('/support')
  })

  it('renders the default "?" glyph and a custom icon override', async () => {
    expect((await render(bare)).host.innerHTML).toContain('?')
    const custom = await render(withIcon)
    expect(custom.host.innerHTML).toContain('data-icon')
  })

  it('uses the default "Help" aria-label and a custom label', async () => {
    expect(root((await render(bare)).host).getAttribute('aria-label')).toBe('Help')
    expect(
      root((await render(bare, { label: 'Get support' })).host).getAttribute('aria-label'),
    ).toBe('Get support')
  })

  it('renders the notification dot only when hasNotification is set', async () => {
    // the dot is a small absolute-positioned span with a border-radius
    const withDot = (await render(bare, { hasNotification: true })).host.innerHTML
    expect(withDot).toMatch(/border-radius:\s*50%/)
    const without = (await render(bare)).host.innerHTML
    expect(without).not.toMatch(/border-radius:\s*50%/)
  })

  it('uses fixed positioning for a corner position and drops it for inline', async () => {
    expect(
      root((await render(bare, { position: 'bottom-right' })).host).getAttribute('style'),
    ).toMatch(/position:\s*fixed/)
    expect(
      root((await render(bare, { position: 'inline' })).host).getAttribute('style'),
    ).not.toMatch(/position:\s*fixed/)
  })

  it('forwards className', async () => {
    const m = await render(bare, { className: 'hb-cls' })
    expect(root(m.host).getAttribute('class')).toContain('hb-cls')
  })

  it('shows and removes the icon wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await render(
      `<div mol-help-button [label]="p['label']" [onClick]="p['onClick']">@if (p['on']) {<span slot="icon" data-icon>★</span>}</div>`,
      { label: 'Help', onClick: () => {}, on: false },
    )
    // React renders the default `?` glyph while no icon is projected.
    expect(root(m.host).textContent).toContain('?')
    expect(root(m.host).querySelector('[data-icon]')).toBeNull()
    await m.setProps({ on: true })
    const icon = root(m.host).querySelector('[data-icon]')
    // React renders `{icon}` bare inside the content span, and drops the glyph.
    expect(icon).not.toBeNull()
    expect(icon?.parentElement?.tagName).toBe('SPAN')
    expect(root(m.host).textContent).not.toContain('?')
    await m.setProps({ on: false })
    expect(root(m.host).querySelector('[data-icon]')).toBeNull()
    expect(root(m.host).textContent).toContain('?')
  })

  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await render(
      `<i>a</i><div mol-help-button [onClick]="p['onClick']" [href]="p['href']"></div><i>b</i>`,
      { onClick: () => {} },
    )
    const children = (): string[] =>
      Array.from(m.host.children).map((child) => child.tagName.toLowerCase())
    // React's root is the `<button>` (no href) or the `<a>` (href): it renders
    // bare between the two consumer siblings, with no host element of its own.
    expect(children()).toEqual(['i', 'button', 'i'])
    await m.setProps({ href: '/support' })
    expect(children()).toEqual(['i', 'a', 'i'])
  })
})
