// @vitest-environment jsdom
/**
 * Every prop a component's core type declares reaches the DOM: `BaseProps.automationId` renders
 * as `data-mol-id` where the component puts `testId`, and `HTMLElementProps` (`id`, `title`,
 * the DOM event handlers) reach the same element. A typed prop that silently did nothing would
 * break the automation hook agents and E2E tests look for.
 *
 * The counterpart of `@molecule/app-ui-react/src/__tests__/declared-props.test.tsx`: each case
 * mounts an Angular host component written the way an app writes the kit's components.
 *
 * @module
 */
// Register Angular's JIT compiler facade before any @Component class loads.
import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  createComponent,
  provideZonelessChangeDetection,
  signal,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

// The kit's Input, Select and Textarea read `fieldLayout` from this module, so the actual module
// stays and only the ClassMap is replaced.
vi.mock('@molecule/app-ui', async (importOriginal) => {
  // The class map's variant factories (called with options); every other property is a class token.
  const factories = new Set([
    'accordion',
    'alert',
    'alertLeftAccent',
    'avatar',
    'badge',
    'button',
    'card',
    'cardPadding',
    'checkbox',
    'container',
    'flex',
    'fontWeight',
    'grid',
    'h',
    'input',
    'label',
    'minH',
    'minW',
    'modal',
    'pagination',
    'position',
    'progress',
    'progressBar',
    'progressColor',
    'progressHeight',
    'radio',
    'radioGroupLayout',
    'select',
    'separator',
    'skeleton',
    'sp',
    'spacer',
    'spinner',
    'stack',
    'switchBase',
    'switchThumb',
    'tabsContent',
    'tabsList',
    'tabsTrigger',
    'textSize',
    'toast',
    'toastContainer',
    'textarea',
    'w',
  ])
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    getClassMap: () => {
      const handler: ProxyHandler<Record<string, unknown>> = {
        get(_t, prop) {
          if (prop === 'cn') {
            return (...cls: unknown[]) =>
              cls
                .flat(Infinity)
                .filter((c) => typeof c === 'string' && c.length > 0)
                .join(' ')
          }
          const token = String(prop)
          if (factories.has(token)) return (..._args: unknown[]) => token
          return token
        },
      }
      return new Proxy({}, handler)
    },
  }
})

vi.mock('@molecule/app-icons', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getIcon: () => ({ paths: [{ d: 'M0 0' }], viewBox: '0 0 16 16' }),
}))

// Partial: the real binding's `RoutedView` (AuthGuard's routed page) and the rest stay real.
vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? '',
    locale: () => 'en',
    locales: () => ['en'],
    setLocale: () => Promise.resolve(),
  }),
  useRouter: () => ({ location: () => ({ pathname: '/', search: '' }) }),
  useAuth: () => ({ status: () => 'authenticated' }),
  useTheme: () => ({ theme: () => 'light', setTheme: () => undefined }),
}))

const ui = await import('../index.js')
const { useToast } = ui

/** The `automationId` every case passes; its element is `[data-mol-id="parity-auto"]`. */
const AUTO = 'parity-auto'
/** Components whose own `title` prop (their heading) takes the place of the HTML attribute. */
const OWN_TITLE = new Set(['Modal', 'Alert', 'Toast'])

let appRef: ApplicationRef | null = null

afterEach(() => {
  appRef?.destroy()
  appRef = null
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

const marked = (): HTMLElement | null => document.querySelector(`[data-mol-id="${AUTO}"]`)

/** Dispatches the pointer sequence a real double click produces (the conformance kit's order). */
const doubleClick = (el: Element): void => {
  for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click', 'click'])
    el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }))
  el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true }))
}

/**
 * Mounts a host component carrying the case's template; the case's props are fields on it.
 *
 * @param template - The host template, written as an app writes the components.
 * @param imports - The standalone components the template uses.
 * @param props - Extra fields (data props, callbacks) the template reads.
 * @returns The host instance (its `captured` field holds what a template passed to `capture`).
 */
async function mount(
  template: string,
  imports: Type<unknown>[],
  props: Record<string, unknown> = {},
): Promise<{ captured: unknown }> {
  const Host = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'div[data-test-host]',
    standalone: true,
    imports,
    template,
  })(
    class DeclaredPropsHost {
      a = AUTO
      i = 'parity-id'
      t = 'Parity title'
      onDoubleClick = (_event: Event): void => {}
      /** The last value a template read for a ref case. */
      captured: unknown = undefined
      /**
       * Records a template variable's reading (`capture(ref.element())`) and renders nothing.
       *
       * @param value - The value the template read.
       * @returns An empty string (the interpolation renders no text).
       */
      capture = (value: unknown): string => {
        this.captured = value
        return ''
      }
    },
  )
  appRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref = createComponent(Host, { environmentInjector: appRef.injector })
  Object.assign(ref.instance, props)
  document.body.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  appRef.tick()
  return ref.instance
}

const options = [{ value: 'free', label: 'Free' }]
const rows = [{ id: 'r1', name: 'Ada' }]
const columns = [{ key: 'name', header: 'Name' }]
const commit = async (): Promise<boolean> => true

/** Components whose core props extend `HTMLElementProps`, each rendered with its declared props. */
const elementCases: Array<[string, string, Type<unknown>[], Record<string, unknown>?]> = [
  [
    'Button',
    `<button mol-button [automationId]="a" [attr.id]="i" [attr.title]="t" (dblclick)="onDoubleClick($event)">Save</button>`,
    [ui.Button],
  ],
  [
    'Input',
    `<div mol-input name="plain" [automationId]="a" [id]="i" [attr.title]="t" (dblclick)="onDoubleClick($event)"></div>`,
    [ui.Input],
  ],
  [
    'Textarea',
    `<div mol-textarea name="notes" [automationId]="a" [id]="i" [attr.title]="t" (dblclick)="onDoubleClick($event)"></div>`,
    [ui.Textarea],
  ],
  [
    'Select',
    `<div mol-select [options]="options" [automationId]="a" [id]="i" [attr.title]="t" (dblclick)="onDoubleClick($event)"></div>`,
    [ui.Select],
    { options },
  ],
  [
    'Checkbox',
    `<div mol-checkbox name="agree" [automationId]="a" [id]="i" [attr.title]="t" (dblclick)="onDoubleClick($event)"></div>`,
    [ui.Checkbox],
  ],
  [
    'Switch',
    `<mol-switch [automationId]="a" [attr.id]="i" [attr.title]="t" (dblclick)="onDoubleClick($event)"></mol-switch>`,
    [ui.Switch],
  ],
  [
    'Modal',
    `<mol-modal [open]="true" [title]="t" [automationId]="a" [attr.id]="i" (dblclick)="onDoubleClick()"></mol-modal>`,
    [ui.Modal],
  ],
  [
    'Avatar',
    `<div mol-avatar [automationId]="a" [attr.id]="i" [attr.title]="t" (dblclick)="onDoubleClick($event)"></div>`,
    [ui.Avatar],
  ],
  [
    'Badge',
    `<span mol-badge [automationId]="a" [attr.id]="i" [attr.title]="t" (dblclick)="onDoubleClick($event)">New</span>`,
    [ui.Badge],
  ],
  [
    'Card',
    `<div mol-card [automationId]="a" [attr.id]="i" [attr.title]="t" (dblclick)="onDoubleClick($event)">Body</div>`,
    [ui.Card],
  ],
  [
    'Container',
    `<div mol-container [automationId]="a" [attr.id]="i" [attr.title]="t" (dblclick)="onDoubleClick($event)">Body</div>`,
    [ui.Container],
  ],
  [
    'Flex',
    `<div mol-flex [automationId]="a" [attr.id]="i" [attr.title]="t" (dblclick)="onDoubleClick($event)">Body</div>`,
    [ui.Flex],
  ],
  [
    'Grid',
    `<div mol-grid [automationId]="a" [attr.id]="i" [attr.title]="t" (dblclick)="onDoubleClick($event)">Body</div>`,
    [ui.Grid],
  ],
  [
    'Form',
    `<form mol-form [automationId]="a" [attr.id]="i" [attr.title]="t" (dblclick)="onDoubleClick($event)">Body</form>`,
    [ui.Form],
  ],
  [
    'FormField',
    `<div mol-form-field label="Email" name="email" [automationId]="a" [attr.id]="i" [attr.title]="t" (dblclick)="onDoubleClick($event)"><div mol-input></div></div>`,
    [ui.FormField, ui.Input],
  ],
  [
    'Alert',
    `<div mol-alert [title]="t" [automationId]="a" [attr.id]="i" (dblclick)="onDoubleClick($event)">Careful</div>`,
    [ui.Alert],
  ],
  [
    'Toast',
    `<div mol-toast [title]="t" [duration]="0" [automationId]="a" [id]="i" (dblclick)="onDoubleClick($event)"></div>`,
    [ui.Toast],
  ],
  [
    'Table',
    `<div mol-table [data]="rows" [columns]="columns" [automationId]="a" [id]="i" [title]="t" (dblclick)="onDoubleClick($event)"></div>`,
    [ui.Table],
    { rows, columns },
  ],
  [
    'OptimisticToggleButton',
    `<button mol-optimistic-toggle-button [value]="false" [commit]="commit" activeLabel="On" inactiveLabel="Off" [automationId]="a" [attr.id]="i" [attr.title]="t" (dblclick)="onDoubleClick($event)"></button>`,
    [ui.OptimisticToggleButton],
    { commit },
  ],
]

/** Components whose core props extend only `BaseProps`, each rendered with `automationId`. */
const baseCases: Array<[string, string, Type<unknown>[], Record<string, unknown>?]> = [
  [
    'RadioGroup',
    `<div mol-radio-group [options]="radio" [automationId]="a"></div>`,
    [ui.RadioGroup],
    { radio: [{ value: 'a', label: 'A' }] },
  ],
  ['Spinner', `<div mol-spinner [automationId]="a"></div>`, [ui.Spinner]],
  ['Spacer', `<div mol-spacer [automationId]="a"></div>`, [ui.Spacer]],
  [
    'Tabs',
    `<div mol-tabs [items]="tabs" [automationId]="a"></div>`,
    [ui.Tabs],
    { tabs: [{ value: 'a', label: 'A', content: 'Body' }] },
  ],
  [
    'Accordion',
    `<div mol-accordion [items]="acc" [automationId]="a"></div>`,
    [ui.Accordion],
    { acc: [{ value: 'a', header: 'A', content: 'Body' }] },
  ],
  [
    'Pagination',
    `<nav mol-pagination [page]="1" [totalPages]="10" [automationId]="a"></nav>`,
    [ui.Pagination],
  ],
  ['Skeleton', `<div mol-skeleton [automationId]="a"></div>`, [ui.Skeleton]],
  ['Separator', `<div mol-separator [automationId]="a"></div>`, [ui.Separator]],
  [
    'Dropdown',
    `<mol-dropdown [items]="dd" [automationId]="a"><button slot="trigger">Menu</button></mol-dropdown>`,
    [ui.Dropdown],
    { dd: [{ value: 'a', label: 'A' }] },
  ],
  ['PageShell', `<div mol-page-shell [automationId]="a">Body</div>`, [ui.PageShell]],
  [
    'EmptyState',
    `<div mol-empty-state title="No projects yet" [automationId]="a"></div>`,
    [ui.EmptyState],
  ],
  [
    'PageHeader',
    `<div mol-page-header title="Dashboard" [automationId]="a"></div>`,
    [ui.PageHeader],
  ],
  ['Progress', `<div mol-progress [value]="0" [automationId]="a"></div>`, [ui.Progress]],
  ['ConfirmButton', `<button mol-confirm-button [automationId]="a"></button>`, [ui.ConfirmButton]],
]

describe('declared props reach the DOM', () => {
  it('updates the HTML lang attribute on spoken labels and text', async () => {
    const lang = signal<string | undefined>('fr-CA')
    await mount(
      `<label mol-label [lang]="lang()">Préférences</label>
        <div mol-dropdown-label [lang]="lang()">Options</div>
        <p mol-card-description [lang]="lang()">Carte</p>
        <label mol-label [attr.lang]="'de-DE'">Einstellungen</label>`,
      [ui.Label, ui.DropdownLabel, ui.CardDescription],
      { lang },
    )
    const elements = Array.from(
      document.querySelectorAll('label[mol-label], [mol-dropdown-label], [mol-card-description]'),
    )
    const languages = () => elements.map((element) => element.getAttribute('lang'))

    expect(languages()).toEqual(['fr-CA', 'fr-CA', 'fr-CA', 'de-DE'])

    lang.set('es-MX')
    appRef?.tick()
    expect(languages()).toEqual(['es-MX', 'es-MX', 'es-MX', 'de-DE'])

    lang.set(undefined)
    appRef?.tick()
    expect(languages()).toEqual([null, null, null, 'de-DE'])
  })

  for (const [name, template, imports, props] of [...elementCases, ...baseCases]) {
    it(`${name} renders automationId as data-mol-id`, async () => {
      await mount(template, imports, props)
      expect(marked()).not.toBeNull()
      expect(document.querySelector('[automationid]')).toBeNull()
    })
  }

  for (const [name, template, imports, props] of elementCases) {
    it(`${name} forwards id, title and onDoubleClick to the element automationId marks`, async () => {
      const onDoubleClick = vi.fn()
      await mount(template, imports, { ...props, onDoubleClick })
      const element = marked()
      expect(element?.id).toBe('parity-id')
      if (OWN_TITLE.has(name)) expect(element?.textContent).toContain('Parity title')
      else expect(element?.getAttribute('title')).toBe('Parity title')
      doubleClick(element!)
      expect(onDoubleClick).toHaveBeenCalledTimes(1)
    })
  }

  it('Tooltip forwards its declared props and its ref to the tooltip box', async () => {
    const onDoubleClick = vi.fn()
    const host = await mount(
      `<mol-tooltip [content]="content" [automationId]="a" [id]="i" [title]="t" (dblclick)="onDoubleClick()" #ref><button>Share</button></mol-tooltip><span>{{ capture(ref.element()) }}</span>`,
      [ui.Tooltip],
      { onDoubleClick, content: 'Copy link' },
    )
    const share = Array.from(document.querySelectorAll('button')).find(
      (button) => button.textContent === 'Share',
    )!
    share.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    appRef!.tick()
    appRef!.tick()
    const box = marked()
    expect(box?.getAttribute('role')).toBe('tooltip')
    expect(box?.id).toBe('parity-id')
    expect(box?.getAttribute('title')).toBe('Parity title')
    expect(host.captured).toBe(box)
    expect(share.getAttribute('aria-describedby')).toBe('parity-id')
    doubleClick(box!)
    expect(onDoubleClick).toHaveBeenCalledTimes(1)
  })

  it("Input hands a caller's ref its native input, not its label wrapper", async () => {
    const host = await mount(
      `<div mol-input label="Email" name="email" #ref></div><span>{{ capture(ref.element()) }}</span>`,
      [ui.Input],
    )
    appRef!.tick()
    expect(host.captured).toBeInstanceOf(HTMLInputElement)
    expect(host.captured instanceof HTMLInputElement ? host.captured.name : '').toBe('email')
  })

  it('Dropdown leaves a cloned trigger its own test id, automation id and ref', async () => {
    await mount(
      `<mol-dropdown [items]="dd"><button slot="trigger" data-testid="own-trigger" data-mol-id="own-auto">Menu</button></mol-dropdown>`,
      [ui.Dropdown],
      { dd: [{ value: 'a', label: 'A' }] },
    )
    const trigger = document.querySelector('[data-testid="own-trigger"]')
    expect(trigger?.getAttribute('data-mol-id')).toBe('own-auto')
    expect(trigger?.tagName).toBe('BUTTON')
  })

  it('a Modal caller role replaces the dialog default', async () => {
    await mount(
      `<mol-modal [open]="true" [title]="t" role="alertdialog" [automationId]="a"></mol-modal>`,
      [ui.Modal],
    )
    expect(marked()?.getAttribute('role')).toBe('alertdialog')
  })

  it('useToast keeps the id a caller gives, as the element id and the removeToast handle', async () => {
    let api: ReturnType<typeof useToast> | undefined
    const Probe = Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'div[data-toast-probe]',
      standalone: true,
      template: '',
    })(
      class ToastProbe {
        // A field initializer runs in the component's injection context.
        readonly toast = useToast()
        constructor() {
          api = this.toast
        }
      },
    )
    await mount(`<mol-toast-provider><div data-toast-probe></div></mol-toast-provider>`, [
      ui.ToastProvider,
      Probe,
    ])
    const returned = api!.addToast({ id: 'upload-done', title: 'Uploaded', duration: 0 })
    appRef!.tick()
    expect(returned).toBe('upload-done')
    expect(document.getElementById('upload-done')?.textContent).toContain('Uploaded')
    api!.removeToast('upload-done')
    appRef!.tick()
    expect(document.getElementById('upload-done')).toBeNull()
  })

  it('useToast gives toasts in two providers different generated ids', async () => {
    const apis: Array<ReturnType<typeof useToast>> = []
    const Probe = Component({
      changeDetection: ChangeDetectionStrategy.Eager,
      selector: 'div[data-toast-probe]',
      standalone: true,
      template: '',
    })(
      class ToastProbe {
        // A field initializer runs in the component's injection context.
        readonly toast = useToast()
        constructor() {
          apis.push(this.toast)
        }
      },
    )
    await mount(
      `<mol-toast-provider><div data-toast-probe></div></mol-toast-provider><mol-toast-provider><div data-toast-probe></div></mol-toast-provider>`,
      [ui.ToastProvider, Probe],
    )
    const first = apis[0]!.addToast({ title: 'One', duration: 0 })
    const second = apis[1]!.addToast({ title: 'Two', duration: 0 })
    appRef!.tick()
    expect(apis).toHaveLength(2)
    expect(first).not.toBe(second)
    expect(document.getElementById(first)?.textContent).toContain('One')
    expect(document.getElementById(second)?.textContent).toContain('Two')
  })
})
