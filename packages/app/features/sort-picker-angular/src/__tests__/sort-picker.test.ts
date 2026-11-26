// @vitest-environment jsdom
/**
 * Unit tests of `SortPicker` — the port of
 * `@molecule/app-sort-picker-react`'s own suite: the same test names and the
 * same behavioral assertions. The React suite renders the component with
 * mocked UI dependencies and asserts the markup; this port mounts the same
 * mocked tree through Angular's real renderer (the same `createApplication` +
 * JIT host approach the conformance kit's Angular adapter uses) and asserts
 * the same markup strings.
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
// `textSize`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React package's own tests use.
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

// The Select marker the React suite mocks `@molecule/app-ui-react` with: a
// `data-select` element carrying the value it received. The SortPicker writes
// the accessible name onto that native select, which the real Angular Select
// is (its host is the wrapper React renders).
vi.mock('@molecule/app-ui-angular', async (importOriginal) => {
  const { Component: NgComponent } = await import('@angular/core')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Select: NgComponent({
      selector: 'div[mol-select]',
      standalone: true,
      inputs: ['value', 'options'],
      template: `<select data-select [attr.data-value]="value">
        @for (option of options ?? []; track option.value) {
          <option [attr.value]="option.value">{{ option.label }}</option>
        }
      </select>`,
    })(
      class MockSelect {
        /** Controlled value. */
        value?: string
        /** The options to render. */
        options?: { value: string; label: unknown }[]
      },
    ),
  }
})

const { SortPicker } = await import('../sort-picker.component.js')

/** A mounted spec host: its DOM, a props setter, and a teardown. */
interface Mounted {
  /** The host element the component template rendered into. */
  readonly host: HTMLElement
  /** The rendered sort picker root element. */
  readonly picker: HTMLElement
  /** Merges props over the current ones and flushes change detection. */
  setProps(next: Record<string, unknown>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/**
 * Mounts the picker through a JIT host template, written the way an Angular
 * app would write it.
 *
 * @param props - The props the host binds.
 * @param labelHtml - Projected `[slot=label]` content, when the case passes one.
 * @returns The mounted host.
 */
async function mount(props: Record<string, unknown> = {}, labelHtml = ''): Promise<Mounted> {
  const template =
    `<div mol-sort-picker [value]="p['value']" [options]="p['options']" [label]="p['label']" ` +
    `[ariaLabel]="p['ariaLabel']" [labelPosition]="p['labelPosition']" [className]="p['className']">` +
    `${labelHtml}</div>`
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [SortPicker as Type<unknown>],
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
  // A second pass: the default label text is decided at view init.
  appRef.tick()
  const picker = host.querySelector('[mol-sort-picker]') as HTMLElement
  return {
    host,
    picker,
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
 * Renders the picker with the given props and projected label content.
 *
 * @param props - The picker props.
 * @param labelHtml - Projected `[slot=label]` content.
 * @returns The mounted host.
 */
const render = async (props: Record<string, unknown> = {}, labelHtml = ''): Promise<Mounted> => {
  const m = await mount(props, labelHtml)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
})

const options = [
  { value: 'recent', label: 'Most recent' },
  { value: 'popular', label: 'Most popular' },
]

describe('SortPicker', () => {
  it('renders the default "Sort by" label inline', async () => {
    const m = await render({ value: 'recent', options })
    // The visible text: Angular's comment anchors sit between the label's text nodes.
    expect(m.picker.textContent).toContain('Sort by:')
    expect(m.picker.innerHTML).toContain('data-select=""')
  })

  it('honours a custom label', async () => {
    const m = await render({ value: 'recent', options, label: 'Order' })
    expect(m.picker.innerHTML).toContain('Order')
  })

  it('reflects the current value on the Select', async () => {
    const m = await render({ value: 'popular', options })
    expect(m.picker.innerHTML).toContain('data-value="popular"')
  })

  it('renders the label above the select when labelPosition is "above"', async () => {
    const m = await render({ value: 'recent', options, labelPosition: 'above' })
    // no trailing colon in the "above" layout
    expect(m.picker.innerHTML).toContain('Sort by')
    expect(m.picker.innerHTML).not.toContain('Sort by:')
  })

  it('forwards className', async () => {
    const m = await render({ value: 'recent', options, className: 'sp-cls' })
    expect(m.picker.getAttribute('class') ?? '').toContain('sp-cls')
  })

  it('renders a ReactNode label as JSX nodes, never "[object Object]"', async () => {
    const m = await render(
      { value: 'recent', options },
      `<strong slot="label" data-testid="rich-label">Sort results</strong>`,
    )
    expect(m.picker.innerHTML).toContain('<strong')
    expect(m.picker.innerHTML).toContain('Sort results')
    expect(m.picker.innerHTML).not.toContain('[object Object]')
  })

  it('uses the ariaLabel prop for the select accessible name when label is a node', async () => {
    const m = await render(
      { value: 'recent', options, ariaLabel: 'Sort the results' },
      `<strong slot="label">Sort</strong>`,
    )
    expect(m.picker.querySelector('select')?.getAttribute('aria-label')).toBe('Sort the results')
    expect(m.picker.innerHTML).not.toContain('[object Object]')
  })

  it('falls back to the default label string for aria-label (not a stringified node)', async () => {
    const m = await render({ value: 'recent', options }, `<em slot="label">Order</em>`)
    expect(m.picker.querySelector('select')?.getAttribute('aria-label')).toBe('Sort by')
    expect(m.picker.innerHTML).not.toContain('[object Object]')
  })

  it('renders each option label as option text (no coercion artifacts)', async () => {
    const m = await render({ value: 'recent', options })
    expect(m.picker.innerHTML).toContain('Most recent')
    expect(m.picker.innerHTML).toContain('Most popular')
    expect(m.picker.innerHTML).not.toContain('[object Object]')
  })
})
