// @vitest-environment jsdom
/**
 * Unit tests of `FilterBar` — the port of
 * `@molecule/app-filter-bar-react`'s own suite. The React suite renders the
 * component with mocked UI dependencies and asserts the markup; this port
 * mounts the same tree through Angular's real renderer and asserts the same
 * behavior.
 *
 * @module
 */

import '@angular/compiler'
import {
  type AfterViewInit,
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  ElementRef,
  EventEmitter,
  inject,
  provideZonelessChangeDetection,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `uppercase`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use.
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

// A spy `t` so tests can assert *which* key (and values) an aria-label routes
// through, while still returning the English `defaultValue` — with `{{name}}`
// placeholders filled from the values, the way the real providers interpolate.
const { tSpy } = vi.hoisted(() => ({
  tSpy: vi.fn((key: string, values?: Record<string, unknown>, opts?: { defaultValue?: string }) => {
    let s = opts?.defaultValue ?? key
    if (values) {
      for (const [k, v] of Object.entries(values)) {
        s = s.replaceAll(`{{${k}}}`, String(v))
      }
    }
    return s
  }),
}))

vi.mock('@molecule/app-angular', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: tSpy }),
}))

// The Input and Select the React suite renders: native elements that keep the
// contract — the rest attribute (`aria-label`) the real components move onto
// the native field with `moveRestAttributes`, and the change outputs — so the
// bar's own wiring is what the assertions exercise.
vi.mock('@molecule/app-ui-angular', () => ({
  Button: Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'button[mol-button]',
    standalone: true,
    inputs: ['variant', 'color', 'size', 'disabled', 'type'],
    template: `<ng-content></ng-content>`,
  })(
    class MockButton {
      /** Visual variant. */
      variant?: string
      /** Color scheme. */
      color?: string
      /** Button size. */
      size?: string
      /** Whether the button is disabled. */
      disabled = false
      /** The button's type. */
      type = 'button'
    },
  ),
  Input: Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'div[mol-input]',
    standalone: true,
    inputs: ['id', 'type', 'value', 'placeholder'],
    outputs: ['change'],
    template: `<input
      data-input=""
      [attr.id]="id ?? null"
      [attr.type]="type ?? null"
      [attr.value]="value ?? null"
      [attr.placeholder]="placeholder ?? null"
      (input)="change.emit($event)"
    />`,
  })(
    class MockInput implements AfterViewInit {
      /** The input's id. */
      id?: string
      /** The input's type. */
      type = 'text'
      /** The controlled value. */
      value?: string
      /** The input's placeholder. */
      placeholder?: string
      /** Fires on every input event, like React's text-input onChange. */
      readonly change = new EventEmitter<Event>()
      private readonly hostEl: ElementRef<HTMLElement> = inject(ElementRef)
      /**
       * Moves the host's rest attributes onto the native input (the real
       * component's `moveRestAttributes`).
       */
      ngAfterViewInit(): void {
        const host = this.hostEl.nativeElement
        const label = host.getAttribute('aria-label')
        const field = host.querySelector('input')
        if (label && field) field.setAttribute('aria-label', label)
      }
    },
  ),
  Select: Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'div[mol-select]',
    standalone: true,
    inputs: ['id', 'options', 'value'],
    outputs: ['change', 'valueChange'],
    template: `<select
      data-select=""
      [attr.id]="id ?? null"
      (change)="onSelect($event)"
    >
      @for (option of options ?? []; track option.value) {
        <option [attr.value]="option.value">{{ option.label }}</option>
      }
    </select>`,
  })(
    class MockSelect implements AfterViewInit {
      /** The select's id. */
      id?: string
      /** The options to render. */
      options?: { value: string; label: string }[]
      /** The controlled value. */
      value?: string
      /** Fires the native change event. */
      readonly change = new EventEmitter<Event>()
      /** Fires the selected value. */
      readonly valueChange = new EventEmitter<string>()
      private readonly hostEl: ElementRef<HTMLElement> = inject(ElementRef)
      /**
       * Moves the host's rest attributes onto the native select.
       */
      ngAfterViewInit(): void {
        const host = this.hostEl.nativeElement
        const label = host.getAttribute('aria-label')
        const field = host.querySelector('select')
        if (label && field) field.setAttribute('aria-label', label)
      }
      /**
       * Emits both the event and the selected value, like the real Select.
       *
       * @param event - The native change event.
       */
      onSelect(event: Event): void {
        this.change.emit(event)
        this.valueChange.emit((event.target as HTMLSelectElement).value)
      }
    },
  ),
}))

const { FilterBar } = await import('../filter-bar.component.js')

/** Distinguishes each spec host (Angular warns on a reused component id). */
let hostSelector = 0

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
 * Mounts the filter bar through a JIT host template, written the way an
 * Angular app would write it.
 *
 * @param props - The props the template binds as `p['name']`.
 * @param slotContent - The template's projected action content.
 * @param siblings - Wrap the bar in fixed `<i>a</i>` / `<i>b</i>` neighbours.
 * @returns The mounted host.
 */
async function mount(
  props: Record<string, unknown> = {},
  slotContent = `@if (p['actions']) {
        <span slot="actions" data-actions></span>
      }`,
  siblings = false,
): Promise<Mounted> {
  hostSelector += 1
  const Host = Component({
    selector: `mol-spec-host-${hostSelector}`,
    standalone: true,
    imports: [FilterBar],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `${siblings ? '<i>a</i>' : ''}<div
      mol-filter-bar
      [fields]="p['fields']"
      [values]="p['values']"
      [onChange]="p['onChange']"
      [onClear]="p['onClear']"
      [showLabels]="p['showLabels']"
      [className]="p['className']"
    >
      ${slotContent}
    </div>${siblings ? '<i>b</i>' : ''}`,
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

/**
 * Mounts a filter bar and remembers it for teardown.
 *
 * @param props - The component props.
 * @returns The mounted host.
 */
const render = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

describe('FilterBar', () => {
  it('keeps a consumer list in order when an item is inserted in the middle of actions', async () => {
    const m = await mount(
      { xs: [1, 3] },
      '@for (x of p[\'xs\']; track x) {<button slot="actions"><b>{{ x }}</b></button>}',
    )
    mounted.push(m)
    const texts = (): string[] =>
      Array.from(m.host.querySelectorAll('button[slot="actions"] b')).map(
        (el) => el.textContent ?? '',
      )
    expect(texts()).toEqual(['1', '3'])
    await m.setProps({ xs: [1, 2, 3] })
    expect(texts()).toEqual(['1', '2', '3'])
    await m.setProps({ xs: [1, 3] })
    expect(texts()).toEqual(['1', '3'])
  })

  beforeEach(() => tSpy.mockClear())

  it('renders a text input with the field label as aria-label', async () => {
    const fields = [{ id: 'q', type: 'text', label: 'Search' }]
    const { host } = await render({ fields, values: {}, onChange: () => {} })
    const markup = host.innerHTML
    expect(markup).toContain('data-input=""')
    expect(markup).toContain('aria-label="Search"')
  })

  it('renders a select control for a select field', async () => {
    const fields = [
      { id: 'status', type: 'select', label: 'Status', options: [{ value: 'a', label: 'A' }] },
    ]
    const { host } = await render({ fields, values: {}, onChange: () => {} })
    const markup = host.innerHTML
    expect(markup).toContain('data-select=""')
    expect(markup).toContain('aria-label="Status"')
  })

  it('renders a multi field as a comma-joined text input', async () => {
    const fields = [
      { id: 'tags', type: 'multi', label: 'Tags', options: [{ value: 'x', label: 'X' }] },
    ]
    const { host } = await render({ fields, values: { tags: ['x', 'y'] }, onChange: () => {} })
    expect(host.innerHTML).toContain('value="x, y"')
  })

  it('renders a date-range field as two date inputs with from/to aria-labels', async () => {
    const fields = [{ id: 'created', type: 'date-range', label: 'Created' }]
    const { host } = await render({ fields, values: {}, onChange: () => {} })
    const markup = host.innerHTML
    expect(markup).toContain('aria-label="Created from"')
    expect(markup).toContain('aria-label="Created to"')
  })

  it('routes the date-range from/to aria-labels through t() with filterBar keys', async () => {
    const fields = [{ id: 'created', type: 'date-range', label: 'Created' }]
    await render({ fields, values: {}, onChange: () => {} })
    expect(tSpy).toHaveBeenCalledWith(
      'filterBar.from',
      { label: 'Created' },
      { defaultValue: '{{label}} from' },
    )
    expect(tSpy).toHaveBeenCalledWith(
      'filterBar.to',
      { label: 'Created' },
      { defaultValue: '{{label}} to' },
    )
  })

  it('styles the showLabels eyebrow from cm.* tokens, not a raw Tailwind literal', async () => {
    const fields = [{ id: 'q', type: 'text', label: 'Search' }]
    const { host } = await render({ fields, values: {}, onChange: () => {}, showLabels: true })
    const labeled = host.innerHTML
    // Eyebrow styling comes from cm.uppercase / cm.trackingWide / cm.textMuted.
    expect(labeled).toContain('trackingWide')
    expect(labeled).toContain('textMuted')
    // The old raw Tailwind literal must be gone.
    expect(labeled).not.toContain('tracking-widest')
    expect(labeled).not.toContain('text-on-surface-variant')
  })

  it('renders a clear button only when onClear is supplied', async () => {
    const fields = [{ id: 'q', type: 'text', label: 'Search' }]
    const withClear = await render({ fields, values: {}, onChange: () => {}, onClear: () => {} })
    expect(withClear.host.innerHTML).toContain('Clear filters')
    const without = await render({ fields, values: {}, onChange: () => {} })
    expect(without.host.innerHTML).not.toContain('Clear filters')
  })

  it('renders the actions slot', async () => {
    const fields = [{ id: 'q', type: 'text', label: 'Search' }]
    const { host } = await render({ fields, values: {}, onChange: () => {}, actions: true })
    expect(host.innerHTML).toContain('data-actions')
  })

  it('wraps fields in a <label> showing the field label when showLabels is true', async () => {
    const fields = [{ id: 'q', type: 'text', label: 'Search' }]
    const labeled = await render({ fields, values: {}, onChange: () => {}, showLabels: true })
    expect(labeled.host.innerHTML).toContain('<label')
    expect(labeled.host.innerHTML).toContain('Search')
    await labeled.destroy()
    mounted.splice(mounted.indexOf(labeled), 1)
    const unlabeled = await render({ fields, values: {}, onChange: () => {} })
    expect(unlabeled.host.innerHTML).not.toContain('<label')
  })

  it('forwards className', async () => {
    const fields = [{ id: 'q', type: 'text', label: 'Search' }]
    const { host } = await render({ fields, values: {}, onChange: () => {}, className: 'fb-cls' })
    expect(host.innerHTML).toContain('fb-cls')
  })

  it('shows and removes the actions wrapper in the pass where the consumer @if adds and removes its content', async () => {
    const m = await mount(
      { fields: [], values: {}, onChange: () => {}, on: false },
      `@if (p['on']) {<button slot="actions" data-actions type="button">Clear</button>}`,
    )
    mounted.push(m)
    const bar = (): HTMLElement => {
      const el = m.host.querySelector('[mol-filter-bar]')
      if (!el) throw new Error('no filter bar rendered')
      return el as HTMLElement
    }
    expect(m.host.querySelector('[data-actions]')).toBeNull()
    await m.setProps({ on: true })
    const actions = m.host.querySelector('[data-actions]')
    // React renders `{actions}` bare in the bar, with no capture wrapper.
    expect(actions?.parentElement).toBe(bar())
    await m.setProps({ on: false })
    expect(m.host.querySelector('[data-actions]')).toBeNull()
  })

  it('renders the actions bare when they come through an OnPush component, in the pass where the consumer @if adds and removes its content', async () => {
    // No hook of the bar runs here: the OnPush component in between is not checked when only the
    // consumer's @if changes. React has no such boundary; its actions follow the consumer's state.
    const Mid = Component({
      selector: 'mol-spec-onpush-mid',
      standalone: true,
      imports: [FilterBar],
      changeDetection: ChangeDetectionStrategy.OnPush,
      template: `<div mol-filter-bar [fields]="[]" [values]="{}" [onChange]="noop"><ng-content select="[slot=actions]" ngProjectAs="[slot=actions]"></ng-content></div>`,
    })(
      class SpecOnPushMid {
        /** The bar's required change handler. */
        readonly noop = (): void => {}
      },
    )
    const Consumer = Component({
      selector: 'mol-spec-onpush-consumer',
      standalone: true,
      imports: [Mid],
      changeDetection: ChangeDetectionStrategy.Eager,
      template: `<mol-spec-onpush-mid>@if (on) {<button slot="actions" data-actions type="button">Clear</button>}</mol-spec-onpush-mid>`,
    })(
      class SpecOnPushConsumer {
        /** Whether the consumer renders the actions. */
        on = false
      },
    )
    const appRef: ApplicationRef = await createApplication({
      providers: [provideZonelessChangeDetection(), provideDomPlacement()],
    })
    const ref: ComponentRef<{ on: boolean }> = createComponent(Consumer, {
      environmentInjector: appRef.injector,
    })
    const host = ref.location.nativeElement as HTMLElement
    document.body.appendChild(host)
    appRef.attachView(ref.hostView)
    try {
      appRef.tick()
      const set = (on: boolean): void => {
        ref.instance.on = on
        ref.changeDetectorRef.markForCheck()
        appRef.tick()
      }
      expect(host.querySelector('[data-actions]')).toBeNull()
      set(true)
      expect(host.querySelector('[data-actions]')?.parentElement).toBe(
        host.querySelector('[mol-filter-bar]'),
      )
      set(false)
      expect(host.querySelector('[data-actions]')).toBeNull()
    } finally {
      appRef.destroy()
      host.remove()
    }
  })

  it("renders React's elements with no host or capture element of its own", async () => {
    const fields = [{ id: 'q', type: 'text', label: 'Search' }]
    const m = await mount(
      { fields, values: {}, onChange: () => {}, on: true },
      `@if (p['on']) {<button slot="actions" data-actions type="button">Go</button>}`,
      true,
    )
    mounted.push(m)
    // The consumer's children are exactly React's: the two neighbours and the bar
    // (its root, so the host element itself), with no extra host or capture.
    const shape = (): string =>
      Array.from(m.host.childNodes)
        .filter(
          (n) => n.nodeType === 1 || (n.nodeType === 3 && (n.textContent ?? '').trim() !== ''),
        )
        .map((n) => (n.nodeType === 1 ? (n as Element).tagName : '#text'))
        .join(',')
    const bar = (): HTMLElement => m.host.querySelector('[mol-filter-bar]') as HTMLElement
    expect(shape()).toBe('I,DIV,I')
    // The projected actions render bare in the bar, no capture span around them.
    expect((m.host.querySelector('[data-actions]') as HTMLElement).parentElement).toBe(bar())
    await m.setProps({ on: false })
    expect(shape()).toBe('I,DIV,I')
    expect(m.host.querySelector('[data-actions]')).toBeNull()
  })
})
