// @vitest-environment jsdom
/**
 * Unit tests of `DangerZoneSection` — the port of
 * `@molecule/app-danger-zone-react`'s own suite. The React suite renders the
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

// Proxy ClassMap echoing each accessed member back as its token (e.g.
// `card`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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

// app-ui-angular stubs: Button forwards disabled + color, the stub
// ConfirmDialog is the sentinel for the re-export identity test — the same
// observable contract the React suite's `@molecule/app-ui-react` mock has.
vi.mock('@molecule/app-ui-angular', async () => {
  const { Component } = await import('@angular/core')
  const Button = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'button[mol-button]',
    standalone: true,
    inputs: ['variant', 'color', 'disabled', 'loading', 'type'],
    host: {
      'data-button': '',
      '[attr.data-color]': 'color ?? null',
      '[attr.disabled]': 'disabled || loading ? "" : null',
    },
    template: `<ng-content></ng-content>`,
  })(
    class MockButton {
      /** Visual variant (absorbed; the React stub drops it too). */
      variant?: string
      /** Color variant. */
      color?: string
      /** Disables the button. */
      disabled?: boolean
      /** Marks the button busy. */
      loading?: boolean
      /** Native type. */
      type?: string
    },
  )
  const ConfirmDialog = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'mol-confirm-dialog',
    standalone: true,
    template: `<div data-confirm-dialog=""></div>`,
  })(class MockConfirmDialog {})

  return { Button, ConfirmDialog }
})

const { DangerZoneSection } = await import('../danger-zone-section.component.js')
const { ConfirmDialog } = await import('../confirm-dialog.js')

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

const mounted: Mounted[] = []

/** The component's host element with every input bound from the spec props. */
const hostTemplate = (content = ''): string =>
  `<div mol-danger-zone-section` +
  ` [title]="p['title']" [description]="p['description']" [actionLabel]="p['actionLabel']"` +
  ` [loading]="p['loading']" [disabled]="p['disabled']" [className]="p['className']"` +
  ` [dataMolId]="p['dataMolId']" [onAction]="p['onAction']">${content}</div>`

const render = async (props: Record<string, unknown> = {}, content = ''): Promise<Mounted> => {
  const m = await mount(hostTemplate(content), DangerZoneSection as Type<unknown>, props)
  mounted.push(m)
  return m
}

const noop = (): void => {}

const base = {
  title: 'Delete account',
  description: 'Permanently remove this account.',
  actionLabel: 'Delete account',
  onAction: noop,
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('ConfirmDialog re-export', () => {
  it('re-exports the framework bundle component unchanged', () => {
    void ConfirmDialog
    expect(ConfirmDialog).toBeDefined()
  })
})

describe('DangerZoneSection', () => {
  it('renders the title in an <h3> and the description', async () => {
    const m = await render(base)
    expect(m.host.innerHTML).toContain('<h3')
    expect(m.host.innerHTML).toContain('Delete account')
    expect(m.host.innerHTML).toContain('Permanently remove this account.')
  })

  it('renders the actionLabel on the button', async () => {
    const m = await render(base)
    expect(m.host.innerHTML).toContain('data-button=""')
    expect(m.host.innerHTML).toContain('data-color="error"')
  })

  it('shows the loading glyph and disables the button while loading', async () => {
    const m = await render({ ...base, loading: true })
    expect(m.host.innerHTML).toContain('…')
    expect(m.host.innerHTML).toMatch(/<button[^>]*disabled/)
  })

  it('disables the button when disabled is set', async () => {
    const m = await render({ ...base, disabled: true })
    expect(m.host.innerHTML).toMatch(/<button[^>]*disabled/)
  })

  it('renders extra children between description and the action button', async () => {
    const m = await render(base, `<input data-confirm=""/>`)
    expect(m.host.innerHTML).toContain('data-confirm=""')
  })

  it('sets data-mol-id and forwards className onto the Card', async () => {
    const m = await render({ ...base, dataMolId: 'danger-x', className: 'dz-cls' })
    expect(m.host.innerHTML).toContain('data-mol-id="danger-x"')
    expect(m.host.innerHTML).toContain('dz-cls')
  })

  it('keeps a consumer list in order when an item is inserted in the middle of actionLabel', async () => {
    const m = await render(
      { ...base, actionLabel: undefined, xs: ['a', 'c'] },
      `<ng-container ngProjectAs="[slot=actionLabel]">@for (x of p['xs']; track x) {<b>{{ x }}</b>}</ng-container>`,
    )
    const items = (): string[] =>
      [...m.host.querySelectorAll('button b')].map((b) => b.textContent ?? '')
    expect(items()).toEqual(['a', 'c'])
    await m.setProps({ xs: ['a', 'b', 'c'] })
    expect(items()).toEqual(['a', 'b', 'c'])
    await m.setProps({ xs: ['a', 'b'] })
    expect(items()).toEqual(['a', 'b'])
  })

  it('shows and removes the actionLabel wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await render(
      { ...base, actionLabel: undefined, on: false },
      `@if (p['on']) {<span slot="actionLabel" data-label>Delete now</span>}`,
    )
    const button = (): HTMLElement => m.host.querySelector('button') as HTMLElement
    expect(button().querySelector('[data-label]')).toBeNull()
    expect(button().textContent ?? '').not.toContain('Delete now')
    await m.setProps({ on: true })
    expect(button().querySelector('[data-label]')).not.toBeNull()
    expect(button().textContent ?? '').toContain('Delete now')
    await m.setProps({ on: false })
    expect(button().querySelector('[data-label]')).toBeNull()
    expect(button().textContent ?? '').not.toContain('Delete now')
  })

  it('hides the projected action label while loading', async () => {
    const m = await render(
      { ...base, actionLabel: undefined },
      '<span slot="actionLabel" data-label>Delete now</span>',
    )
    expect(m.host.textContent).toContain('Delete now')
    await m.setProps({ loading: true })
    const button = m.host.querySelector('button')!
    // React renders `{loading ? '…' : actionLabel}`: the label is gone.
    expect(button.textContent).toContain('…')
    expect(button.textContent).not.toContain('Delete now')
  })

  it("renders React's elements with no host or capture element of its own", async () => {
    const m = await mount(
      `<i>a</i>${hostTemplate('<span slot="actionLabel" data-label>Delete now</span>')}<i>b</i>`,
      DangerZoneSection as Type<unknown>,
      { ...base, actionLabel: undefined },
    )
    mounted.push(m)
    // The consumer's children are exactly React's: the two neighbours and the
    // card (its root, so the host element itself), with no extra host or capture.
    const shape = (): string =>
      Array.from(m.host.childNodes)
        .filter(
          (n) => n.nodeType === 1 || (n.nodeType === 3 && (n.textContent ?? '').trim() !== ''),
        )
        .map((n) => (n.nodeType === 1 ? (n as Element).tagName : '#text'))
        .join(',')
    const button = (): HTMLElement => m.host.querySelector('button') as HTMLElement
    expect(shape()).toBe('I,DIV,I')
    // The projected label renders bare on the button, no capture span around it.
    expect((button().querySelector('[data-label]') as HTMLElement).parentElement).toBe(button())
    await m.setProps({ loading: true })
    // React renders `{loading ? '…' : actionLabel}`: the label leaves, nothing is added.
    expect(shape()).toBe('I,DIV,I')
    expect(button().querySelector('[data-label]')).toBeNull()
  })
})
