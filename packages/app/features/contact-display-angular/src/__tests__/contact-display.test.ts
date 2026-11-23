// @vitest-environment jsdom
/**
 * Unit tests of `ContactDisplay` — the port of
 * `@molecule/app-contact-display-react/src/__tests__/contact-display.test.tsx`.
 * The React suite renders the component with mocked UI dependencies and
 * asserts the markup; this port mounts the same mocked tree through Angular's
 * real renderer with the same UI-package stubs, and asserts the same markup
 * strings.
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
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use. `flex` encodes its direction so
// the tests can distinguish the card (column) layout from the row/compact
// (row) layouts.
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
        if (prop === 'flex') {
          return (opts?: { direction?: string }) =>
            `flex${opts?.direction ? ` flex-${opts.direction}` : ''}`
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-ui-angular', async () => {
  const { Component: NgComponent } = await import('@angular/core')
  // The real package's plain helpers (asTemplate), so the component's
  // TemplateRef path keeps working.
  const actual = (await vi.importActual('@molecule/app-ui-angular')) as Record<string, unknown>
  // The same stub the React tests install for `@molecule/app-ui-react`:
  // an `<img data-avatar data-avatar-name>`. The `Component(...)` factory is
  // called as a plain function (no decorator syntax) so the hoisted mock
  // factory stays plain JavaScript.
  const Avatar = NgComponent({
    selector: 'div[mol-avatar]',
    standalone: true,
    inputs: ['src', 'name'],
    template: `<img [attr.data-avatar]="src || ''" [attr.data-avatar-name]="name || ''" />`,
  })(
    class AvatarStub {
      /** The avatar image URL (React's `src` input). */
      src: string | undefined = undefined
      /** The contact name (React's `name` input). */
      name: string | undefined = undefined
    },
  )
  return { ...actual, Avatar }
})

const { ContactDisplay } = await import('../contact-display.component.js')

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

const mounted: Mounted[] = []

/** Distinguishes each JIT spec host, so Angular does not report a component-ID collision. */
let hostCount = 0

/**
 * Mounts the ContactDisplay through a JIT host template, written the way an
 * Angular app would write it.
 *
 * @param props - The inputs the template binds as `p['name']`.
 * @param projected - Extra projected content placed inside the component element.
 * @returns The mounted host.
 */
async function render(props: Record<string, unknown> = {}, projected = ''): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [ContactDisplay as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Eager,
    host: { 'data-spec-host': String(++hostCount) },
    template: `<div mol-contact-display [contact]="p['contact']" [layout]="p['layout']" [onClick]="p['onClick']" [className]="p['className']">${projected}</div>`,
  })(
    class SpecHost {
      /** The inputs the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref = createComponent(Host, { environmentInjector: appRef.injector })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  mounted.push({
    host,
    setProps: async (next: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
    },
    destroy: async () => {
      ref.destroy()
      host.remove()
      await appRef.destroy()
    },
  })
  return mounted[mounted.length - 1]!
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

const contact = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '+15551234',
  role: 'CTO',
  company: 'Acme Inc.',
  address: '123 Main St',
}

/** The row's transparent open button. */
const openButton = (host: HTMLElement): HTMLButtonElement =>
  host.querySelector('[data-mol-id="contact-display-open"]')!

describe('ContactDisplay', () => {
  it('renders the name and role', async () => {
    const markup = (await render({ contact })).host.innerHTML
    expect(markup).toContain('Jane Doe')
    expect(markup).toContain('CTO')
  })

  it('renders the avatar carrying the contact name', async () => {
    const markup = (await render({ contact })).host.innerHTML
    expect(markup).toContain('data-avatar-name="Jane Doe"')
  })

  it('renders email and phone as mailto/tel links in the card layout', async () => {
    const markup = (await render({ contact })).host.innerHTML
    expect(markup).toContain('href="mailto:jane@example.com"')
    expect(markup).toContain('href="tel:+15551234"')
    expect(markup).toContain('123 Main St')
  })

  it('hides email/phone/address in the compact layout', async () => {
    const markup = (await render({ contact, layout: 'compact' })).host.innerHTML
    expect(markup).not.toContain('mailto:')
    expect(markup).not.toContain('tel:')
    expect(markup).toContain('Jane Doe')
  })

  it('renders the company', async () => {
    const markup = (await render({ contact })).host.innerHTML
    expect(markup).toContain('Acme Inc.')
  })

  it('marks the row clickable only when onClick is supplied', async () => {
    const clickable = (await render({ contact, onClick: () => {} })).host.innerHTML
    expect(clickable).toContain('position')
    const plain = (await render({ contact })).host.innerHTML
    expect(plain).not.toContain('position')
  })

  it('lays the card layout out as a column and row/compact as a row', async () => {
    // Regression: the outer flex direction used to be `col ? 'row' : 'row'`
    // (both branches 'row'), so the card layout never became a column.
    const card = (await render({ contact, layout: 'card' })).host.innerHTML
    expect(card).toContain('flex-col')
    expect(card).not.toContain('flex-row')

    const row = (await render({ contact, layout: 'row' })).host.innerHTML
    expect(row).toContain('flex-row')
    expect(row).not.toContain('flex-col')

    const compact = (await render({ contact, layout: 'compact' })).host.innerHTML
    expect(compact).toContain('flex-row')
    expect(compact).not.toContain('flex-col')
  })

  it('renders the actions slot and forwards className', async () => {
    const markup = (
      await render(
        { contact, className: 'cd-cls' },
        '<ng-container ngProjectAs="[slot=actions]"><button data-actions=""></button></ng-container>',
      )
    ).host.innerHTML
    expect(markup).toContain('data-actions=""')
    expect(markup).toContain('cd-cls')
  })

  it('renders the open button only when onClick is supplied', async () => {
    const clickable = (await render({ contact, onClick: () => {} })).host.innerHTML
    expect(clickable).toContain('<button type="button"')
    const plain = (await render({ contact })).host.innerHTML
    expect(plain).not.toContain('<button')
  })

  it('clicking the open button calls onClick', async () => {
    const onClick = vi.fn()
    const { host } = await render({ contact, onClick })
    openButton(host).click()
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('clicking an inner control does not call onClick', async () => {
    const onClick = vi.fn()
    const { host } = await render(
      { contact, onClick },
      '<ng-container ngProjectAs="[slot=actions]"><button data-actions=""></button></ng-container>',
    )
    host
      .querySelector('[data-actions]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('the open button is named by the label', async () => {
    const { host } = await render({ contact, onClick: () => {} })
    const namedBy = openButton(host).getAttribute('aria-labelledby')!
    expect(document.getElementById(namedBy)?.textContent).toBe('Jane Doe')
  })

  it('without onClick there is no open button', async () => {
    const { host } = await render({ contact })
    expect(host.querySelector('button')).toBeNull()
    expect(host.querySelector('[data-mol-id="contact-display-open"]')).toBeNull()
  })

  it('keeps a consumer list in order when an item is inserted in the middle of actions', async () => {
    const m = await render(
      { contact, onClick: () => {}, xs: ['a', 'c'] },
      `<ng-container ngProjectAs="[slot=actions]">@for (x of p['xs']; track x) {<b>{{ x }}</b>}</ng-container>`,
    )
    const items = (): string[] => [...m.host.querySelectorAll('b')].map((b) => b.textContent ?? '')
    expect(items()).toEqual(['a', 'c'])
    await m.setProps({ xs: ['a', 'b', 'c'] })
    expect(items()).toEqual(['a', 'b', 'c'])
    await m.setProps({ xs: ['a', 'b'] })
    expect(items()).toEqual(['a', 'b'])
  })

  it('shows and removes the actions wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await render(
      { contact, onClick: () => {}, on: false },
      `@if (p['on']) {<button slot="actions" data-actions></button>}`,
    )
    const action = (): HTMLElement | null => m.host.querySelector<HTMLElement>('[data-actions]')
    expect(action()).toBeNull()
    await m.setProps({ on: true })
    expect(action()).not.toBeNull()
    expect(action()?.parentElement?.getAttribute('class')).toBe('position')
    await m.setProps({ on: false })
    expect(action()).toBeNull()
  })

  it('wraps the projected actions in the raised wrapper once onClick is set', async () => {
    const m = await render(
      { contact },
      '<ng-container ngProjectAs="[slot=actions]"><button data-actions=""></button></ng-container>',
    )
    const root = (): HTMLElement => m.host.querySelector('[mol-contact-display]')!
    const action = (): HTMLElement => m.host.querySelector('[data-actions]')!
    // Without onClick React renders the actions bare: their parent is the root.
    expect(action().parentElement).toBe(root())
    await m.setProps({ onClick: () => {} })
    // With onClick React renders them inside the `position: relative` wrapper.
    expect(action().parentElement).not.toBe(root())
    expect(action().parentElement?.getAttribute('class')).toBe('position')
    expect(action()).not.toBeNull()
  })
})
