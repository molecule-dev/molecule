// @vitest-environment jsdom
/**
 * Slot-timing coverage for the ports migrated onto `usePlacement` in this
 * package: each wrapper or section that a port shows and hides from its
 * projected content follows the consumer's `@if` in the same pass that adds or
 * removes the node, with no extra tick.
 *
 * Every case mounts the port through a host component (`ChangeDetectionStrategy
 * .Default`) whose template wraps the slot content in `@if (p['on'])`, then
 * flips `on` once per step: React's markup with the content, then without it.
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

// The kit's Input, Select and Textarea read `fieldLayout` from this module, so the actual module
// stays and only the ClassMap is replaced.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => {
    // Tokens the port templates CALL as functions; every other token is read as
    // a plain class string (Angular's class binding rejects a function value).
    const CALLABLE = new Set([
      'alert',
      'alertLeftAccent',
      'avatar',
      'button',
      'checkbox',
      'cn',
      'flex',
      'fontWeight',
      'h',
      'input',
      'label',
      'minH',
      'minW',
      'modal',
      'position',
      'sp',
      'stack',
      'switchBase',
      'switchThumb',
      'textSize',
      'toast',
      'toastContainer',
      'w',
    ])
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        if (typeof prop === 'string' && CALLABLE.has(prop)) return () => prop
        return String(prop)
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-icons', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getIcon: vi.fn((name: string) => ({ name, viewBox: '0 0 24 24', paths: [] })),
}))

vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? '',
    locale: () => 'en',
    setLocale: async () => {},
  }),
}))

const { Alert } = await import('../components/alert.component.js')
const { Avatar } = await import('../components/avatar.component.js')
const { Button } = await import('../components/button.component.js')
const { Checkbox } = await import('../components/checkbox.component.js')
const { ConfirmButton } = await import('../components/confirm-button.component.js')
const { ConfirmDialog } = await import('../components/confirm-dialog.component.js')
const { EmptyState } = await import('../components/empty-state.component.js')
const { FormField } = await import('../components/form-field.component.js')
const { Input } = await import('../components/input.component.js')
const { LoadErrorBanner } = await import('../components/load-error-banner.component.js')
const { Modal } = await import('../components/modal.component.js')
const { OptimisticToggleButton } =
  await import('../components/optimistic-toggle-button.component.js')
const { PageHeader } = await import('../components/page-header.component.js')
const { PageShell } = await import('../components/page-shell.component.js')
const { Switch } = await import('../components/switch.component.js')
const { Table } = await import('../components/table.component.js')
const { Toast } = await import('../components/toast.component.js')

const apps: ApplicationRef[] = []
afterEach(() => {
  for (const app of apps.splice(0)) app.destroy()
  document.body.replaceChildren()
})

/**
 * Mounts a host component through Angular's real renderer.
 *
 * @param template - The host template, reading `p` for step props.
 * @param imports - The standalone components the template uses.
 * @param props - The initial step props.
 * @returns The mounted host: its root element and the one-pass `set`.
 */
async function mount(template: string, imports: Type<unknown>[], props: Record<string, unknown>) {
  const Host = Component({
    selector: 'slot-timing-host',
    standalone: true,
    imports,
    changeDetection: ChangeDetectionStrategy.Eager,
    template,
  })(
    class {
      p: Record<string, unknown> = props
    },
  )
  const app = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  apps.push(app)
  const ref = createComponent(Host as Type<{ p: Record<string, unknown> }>, {
    environmentInjector: app.injector,
  })
  const root = ref.location.nativeElement as HTMLElement
  document.body.appendChild(root)
  app.attachView(ref.hostView)
  app.tick()
  return {
    root,
    set(next: Record<string, unknown>) {
      ref.instance.p = { ...ref.instance.p, ...next }
      ref.changeDetectorRef.markForCheck()
      app.tick()
    },
  }
}

/** Whether the marker the slot content carries is in the document. */
const present = (root: HTMLElement): boolean => root.querySelector('[data-slot-content]') !== null

const only = (component: Type<unknown>): Type<unknown>[] => [component]

describe('slot placement timing', () => {
  it('shows and removes the icon wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await mount(
      `<div mol-alert status="primary">@if (p['on']) {<b slot="icon" data-slot-content></b>}</div>`,
      only(Alert),
      { on: false },
    )
    expect(present(m.root)).toBe(false)
    m.set({ on: true })
    expect(present(m.root)).toBe(true)
    m.set({ on: false })
    expect(present(m.root)).toBe(false)
  })

  it('shows and removes the fallback content in the pass where the consumer @if adds and removes it', async () => {
    const m = await mount(
      `<div mol-avatar>@if (p['on']) {<b slot="fallback" data-slot-content></b>}</div>`,
      only(Avatar),
      { on: false },
    )
    expect(present(m.root)).toBe(false)
    m.set({ on: true })
    expect(present(m.root)).toBe(true)
    m.set({ on: false })
    expect(present(m.root)).toBe(false)
  })

  it('shows and removes the left icon wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await mount(
      `<button mol-button>@if (p['on']) {<b slot="leftIcon" data-slot-content></b>}</button>`,
      only(Button),
      { on: false },
    )
    expect(present(m.root)).toBe(false)
    m.set({ on: true })
    expect(present(m.root)).toBe(true)
    m.set({ on: false })
    expect(present(m.root)).toBe(false)
  })

  it('shows and removes the label wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await mount(
      `<div mol-checkbox>@if (p['on']) {<span slot="label" data-slot-content>L</span>}</div>`,
      only(Checkbox),
      { on: false },
    )
    expect(present(m.root)).toBe(false)
    m.set({ on: true })
    expect(present(m.root)).toBe(true)
    m.set({ on: false })
    expect(present(m.root)).toBe(false)
  })

  it('shows and removes the projected label in the pass where the consumer @if adds and removes its content', async () => {
    const m = await mount(
      `<button mol-confirm-button>@if (p['on']) {<span slot="label" data-slot-content>Save</span>}</button>`,
      only(ConfirmButton),
      { on: false },
    )
    expect(present(m.root)).toBe(false)
    m.set({ on: true })
    expect(present(m.root)).toBe(true)
    m.set({ on: false })
    expect(present(m.root)).toBe(false)
  })

  it('associates and drops the description in the pass where the consumer @if adds and removes its content', async () => {
    const m = await mount(
      `<mol-confirm-dialog [open]="true" title="T">@if (p['on']) {<span slot="description" data-slot-content>d</span>}</mol-confirm-dialog>`,
      only(ConfirmDialog),
      { on: false },
    )
    const modal = (): Element | null => document.querySelector('[role="dialog"]')
    // The description slot renders inside the dialog's description paragraph.
    const inDescription = (): boolean =>
      document.querySelector('[role="dialog"] p [data-slot-content]') !== null
    expect(modal()).not.toBeNull()
    expect(inDescription()).toBe(false)
    m.set({ on: true })
    expect(inDescription()).toBe(true)
    m.set({ on: false })
    expect(inDescription()).toBe(false)
  })

  it('shows and removes the icon wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await mount(
      `<div mol-empty-state>@if (p['on']) {<b slot="icon" data-slot-content></b>}</div>`,
      only(EmptyState),
      { on: false },
    )
    expect(present(m.root)).toBe(false)
    m.set({ on: true })
    expect(present(m.root)).toBe(true)
    m.set({ on: false })
    expect(present(m.root)).toBe(false)
  })

  it('adopts and removes the field child in the pass where the consumer @if adds and removes it', async () => {
    const m = await mount(
      `<div mol-form-field name="f">@if (p['on']) {<input data-slot-content />}</div>`,
      only(FormField),
      { on: false },
    )
    expect(present(m.root)).toBe(false)
    m.set({ on: true })
    expect(present(m.root)).toBe(true)
    m.set({ on: false })
    expect(present(m.root)).toBe(false)
  })

  it('adopts the field child again, labelled, each time the consumer @if adds it back', async () => {
    const m = await mount(
      `<div mol-form-field name="f" label="Name">@if (p['on']) {<input data-slot-content />}</div>`,
      only(FormField),
      { on: true },
    )
    const field = m.root.querySelector('[mol-form-field]') as HTMLElement
    for (let round = 0; round < 3; round++) {
      const input = m.root.querySelector('[data-slot-content]') as HTMLInputElement
      // React: `<div><label for={id}>…</label>{cloneElement(child, { id })}</div>`.
      expect(input.parentElement).toBe(field)
      expect(field.querySelector('[data-mol-field-capture]')).toBeNull()
      expect(input.id).not.toBe('')
      expect(field.querySelector('label')!.getAttribute('for')).toBe(input.id)
      m.set({ on: false })
      expect(present(m.root)).toBe(false)
      m.set({ on: true })
    }
  })

  it('clones only a single child as the consumer list grows from one to two, empties and refills', async () => {
    const m = await mount(
      `<div mol-form-field name="pair" label="Pair">@for (k of p['keys']; track k) {<input [attr.name]="k" />}</div>`,
      only(FormField),
      { keys: ['a'] },
    )
    const ids = (): string[] => Array.from(m.root.querySelectorAll('input')).map((i) => i.id)
    const labelFor = (): string | null => m.root.querySelector('label')!.getAttribute('for')
    // One child: React clones it with the field id.
    expect(ids()).toEqual(['pair'])
    // Two children: React clones neither, so the first renders without the id it had.
    m.set({ keys: ['a', 'b'] })
    expect(ids()).toEqual(['', ''])
    m.set({ keys: [] })
    m.set({ keys: ['a', 'b'] })
    expect(ids()).toEqual(['', ''])
    m.set({ keys: ['b'] })
    expect(ids()).toEqual(['pair'])
    expect(labelFor()).toBe('pair')
  })

  it('gives neither Input the field id when the consumer list refills with two', async () => {
    const m = await mount(
      `<div mol-form-field name="pair" label="Pair">@for (k of p['keys']; track k) {<div mol-input [name]="k"></div>}</div>`,
      [FormField, Input],
      { keys: ['a', 'b'] },
    )
    const ids = (): string[] => Array.from(m.root.querySelectorAll('input')).map((i) => i.id)
    expect(ids()).toEqual(['a', 'b'])
    m.set({ keys: [] })
    // Angular inserts the two one at a time; the field is single only while the first is alone.
    m.set({ keys: ['a', 'b'] })
    expect(ids()).toEqual(['a', 'b'])
    expect(m.root.querySelector('label')!.getAttribute('for')).toBe('pair')
  })

  it('shows and removes the left adornment wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await mount(
      `<div mol-input>@if (p['on']) {<b slot="leftElement" data-slot-content></b>}</div>`,
      only(Input),
      { on: false },
    )
    expect(present(m.root)).toBe(false)
    m.set({ on: true })
    expect(present(m.root)).toBe(true)
    m.set({ on: false })
    expect(present(m.root)).toBe(false)
  })

  it('shows and removes the detail wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await mount(
      `<div mol-load-error-banner>@if (p['on']) {<span slot="detail" data-slot-content>d</span>}</div>`,
      only(LoadErrorBanner),
      { on: false },
    )
    expect(present(m.root)).toBe(false)
    m.set({ on: true })
    expect(present(m.root)).toBe(true)
    m.set({ on: false })
    expect(present(m.root)).toBe(false)
  })

  it('shows and removes the footer wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await mount(
      `<mol-modal [open]="true">@if (p['on']) {<div slot="footer" data-slot-content>f</div>}</mol-modal>`,
      only(Modal),
      { on: false },
    )
    // The modal portals its overlay and wrapper into `document.body`.
    const inBody = (): boolean => document.querySelector('[data-slot-content]') !== null
    expect(inBody()).toBe(false)
    m.set({ on: true })
    expect(inBody()).toBe(true)
    m.set({ on: false })
    expect(inBody()).toBe(false)
  })

  it('shows and removes the projected label in the pass where the consumer @if adds and removes its content', async () => {
    const m = await mount(
      `<button mol-optimistic-toggle-button [value]="false" [commit]="commit">@if (p['on']) {<span slot="inactiveLabel" data-slot-content>x</span>}</button>`,
      only(OptimisticToggleButton),
      { on: false, commit: (next: boolean) => Promise.resolve(next) },
    )
    expect(present(m.root)).toBe(false)
    m.set({ on: true })
    expect(present(m.root)).toBe(true)
    m.set({ on: false })
    expect(present(m.root)).toBe(false)
  })

  it('shows and removes the actions wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await mount(
      `<div mol-page-header title="T">@if (p['on']) {<button slot="actions" data-slot-content>a</button>}</div>`,
      only(PageHeader),
      { on: false },
    )
    expect(present(m.root)).toBe(false)
    m.set({ on: true })
    expect(present(m.root)).toBe(true)
    m.set({ on: false })
    expect(present(m.root)).toBe(false)
  })

  it('shows and removes the sidebar wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await mount(
      `<div mol-page-shell>@if (p['on']) {<div slot="sidebar" data-slot-content>s</div>}</div>`,
      only(PageShell),
      { on: false },
    )
    expect(present(m.root)).toBe(false)
    m.set({ on: true })
    expect(present(m.root)).toBe(true)
    m.set({ on: false })
    expect(present(m.root)).toBe(false)
  })

  it('shows and removes the label wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await mount(
      `<mol-switch>@if (p['on']) {<span slot="label" data-slot-content>L</span>}</mol-switch>`,
      only(Switch),
      { on: false },
    )
    expect(present(m.root)).toBe(false)
    m.set({ on: true })
    expect(present(m.root)).toBe(true)
    m.set({ on: false })
    expect(present(m.root)).toBe(false)
  })

  it('shows and removes the empty-state content in the pass where the consumer @if adds and removes it', async () => {
    const m = await mount(
      `<div mol-table [data]="[]" [columns]="[]">@if (p['on']) {<span slot="emptyContent" data-slot-content>none</span>}</div>`,
      only(Table),
      { on: false },
    )
    expect(present(m.root)).toBe(false)
    m.set({ on: true })
    expect(present(m.root)).toBe(true)
    m.set({ on: false })
    expect(present(m.root)).toBe(false)
  })

  it('shows and removes the description wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await mount(
      `<div mol-toast title="T">@if (p['on']) {<span data-slot-content>body</span>}</div>`,
      only(Toast),
      { on: false },
    )
    expect(present(m.root)).toBe(false)
    m.set({ on: true })
    expect(present(m.root)).toBe(true)
    m.set({ on: false })
    expect(present(m.root)).toBe(false)
  })
})
