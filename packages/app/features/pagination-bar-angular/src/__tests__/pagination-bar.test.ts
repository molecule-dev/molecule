// @vitest-environment jsdom
/**
 * Unit tests of `PaginationBar` — the port of
 * `@molecule/app-pagination-bar-react`'s own suite. The React suite renders
 * the component with mocked UI dependencies and asserts the markup; this port
 * mounts the same tree through Angular's real renderer and asserts the same
 * behavior.
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
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token (e.g. `flex`),
// so tests can assert which cm.* class was applied without a real bond — the
// same mock the React package's own tests use.
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

// The chevron the real Select renders; a bond-free icon so no icon set is
// required in a unit test.
vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ paths: [{ d: 'M0 0h1v1H0z' }], viewBox: '0 0 16 16' }),
}))

vi.mock('@molecule/app-angular', () => ({
  useTranslation: () => ({
    t: (
      _key: string,
      values: Record<string, unknown> | undefined,
      opts?: { defaultValue?: string },
    ) => {
      let out = opts?.defaultValue ?? _key
      if (values)
        for (const [k, v] of Object.entries(values)) out = out.replace(`{{${k}}}`, String(v))
      return out
    },
  }),
}))

// The Button and Select the React suite mocks: native elements that keep the
// contract (disabled attribute; `valueChange` carries the selected value), so
// the bar's own wiring is what the assertions exercise.
vi.mock('@molecule/app-ui-angular', async () => {
  const { Component, EventEmitter } = await import('@angular/core')
  return {
    Button: Component({
      selector: 'button[mol-button]',
      standalone: true,
      inputs: ['variant', 'color', 'size', 'disabled', 'type'],
      host: { '[attr.disabled]': 'disabled ? "" : null' },
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
    Select: Component({
      selector: 'div[mol-select]',
      standalone: true,
      inputs: ['options', 'value'],
      outputs: ['valueChange'],
      template: `<select (change)="onSelect($event)">
        @for (option of options ?? []; track option.value) {
          <option [attr.value]="option.value">{{ option.label }}</option>
        }
      </select>`,
    })(
      class MockSelect {
        /** The options to render. */
        options?: { value: string; label: string }[]
        /** Controlled value. */
        value?: string
        /** Fires the selected option's value. */
        readonly valueChange = new EventEmitter<string>()
        /**
         * Reproduces the real Select's typed change dispatch.
         *
         * @param event - The native change event.
         */
        onSelect(event: Event): void {
          this.valueChange.emit((event.target as HTMLSelectElement).value)
        }
      },
    ),
  }
})

const { PaginationBar } = await import('../pagination-bar.component.js')

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
 * Mounts the pagination bar through a JIT host template, written the way an
 * Angular app would write it.
 *
 * @param props - The props the template binds as `p['name']`.
 * @returns The mounted host.
 */
async function mount(props: Record<string, unknown> = {}): Promise<Mounted> {
  hostSelector += 1
  const Host = Component({
    selector: `mol-spec-host-${hostSelector}`,
    standalone: true,
    imports: [PaginationBar],
    changeDetection: ChangeDetectionStrategy.Default,
    template: `<div
      mol-pagination-bar
      [page]="p['page']"
      [totalPages]="p['totalPages']"
      [pageSize]="p['pageSize']"
      [total]="p['total']"
      [onPageChange]="p['onPageChange']"
      [onPageSizeChange]="p['onPageSizeChange']"
      [pageSizeOptions]="p['pageSizeOptions']"
      [showingKey]="p['showingKey']"
      [showingDefault]="p['showingDefault']"
      [className]="p['className']"
    ></div>`,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection()],
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

const render = async (props: Record<string, unknown> = {}): Promise<Mounted> => {
  const m = await mount(props)
  mounted.push(m)
  return m
}

afterEach(async () => {
  for (const m of mounted.splice(0)) await m.destroy()
  document.body.innerHTML = ''
})

const base = {
  page: 1,
  totalPages: 3,
  pageSize: 20,
  total: 50,
  onPageChange: () => {},
}

describe('PaginationBar', () => {
  it('renders the "Showing X to Y of Z" summary', async () => {
    const m = await render(base)
    expect(m.host.innerHTML).toContain('Showing 1 to 20 of 50 items')
  })

  it('renders prev/next buttons and one button per page when totalPages <= 5', async () => {
    const m = await render(base)
    const markup = m.host.innerHTML
    expect(markup).toContain('aria-label="Previous page"')
    expect(markup).toContain('aria-label="Next page"')
    const labels = Array.from(m.host.querySelectorAll('button')).map((button) =>
      button.textContent?.trim(),
    )
    expect(labels).toEqual(['‹', '1', '2', '3', '›'])
  })

  it('marks the current page with aria-current', async () => {
    const m = await render({ ...base, page: 2 })
    expect(m.host.innerHTML.match(/aria-current="page"/g) ?? []).toHaveLength(1)
  })

  it('disables Previous on the first page and Next on the last page', async () => {
    const first = (await render(base)).host
    expect(
      first.querySelector('button[aria-label="Previous page"]')?.hasAttribute('disabled'),
    ).toBe(true)
    expect(first.querySelector('button[aria-label="Next page"]')?.hasAttribute('disabled')).toBe(
      false,
    )
    const last = (await render({ ...base, page: 3 })).host
    expect(last.querySelector('button[aria-label="Next page"]')?.hasAttribute('disabled')).toBe(
      true,
    )
    expect(last.querySelector('button[aria-label="Previous page"]')?.hasAttribute('disabled')).toBe(
      false,
    )
  })

  it('renders ellipses for large page counts', async () => {
    const m = await render({ ...base, page: 10, totalPages: 20 })
    expect(m.host.innerHTML).toContain('…')
  })

  it('renders the page-size selector only when pageSizeOptions + onPageSizeChange are supplied', async () => {
    const withSel = await render({
      ...base,
      pageSizeOptions: [10, 20, 50],
      onPageSizeChange: () => {},
    })
    expect(withSel.host.querySelector('select')).not.toBeNull()
    const without = await render(base)
    expect(without.host.querySelector('select')).toBeNull()
  })

  it('passes the selected page size to onPageSizeChange as a number, not NaN', async () => {
    const onPageSizeChange = vi.fn()
    const m = await render({
      ...base,
      pageSizeOptions: [10, 25, 50],
      onPageSizeChange,
    })
    const select = m.host.querySelector('select')
    if (!select) throw new Error('Select was never rendered')
    // Drive a real selection through the Select's change contract. The old
    // wiring parsed the DOM event instead of the typed value, so it received
    // `Number(event) === NaN`; the fix wires `valueChange`, so the handler
    // receives `Number('25') === 25`.
    select.value = '25'
    select.dispatchEvent(new Event('change', { bubbles: true }))
    expect(onPageSizeChange).toHaveBeenCalledTimes(1)
    expect(onPageSizeChange).toHaveBeenCalledWith(25)
    expect(Number.isNaN(onPageSizeChange.mock.calls[0][0])).toBe(false)
  })

  it('renders one page-size option per entry in pageSizeOptions', async () => {
    const m = await render({
      ...base,
      pageSizeOptions: [10, 25, 50],
      onPageSizeChange: () => {},
    })
    const options = Array.from(m.host.querySelectorAll('option')).map((option) => ({
      value: option.value,
      label: option.textContent?.trim(),
    }))
    expect(options).toEqual([
      { value: '10', label: '10' },
      { value: '25', label: '25' },
      { value: '50', label: '50' },
    ])
  })

  it('forwards className', async () => {
    const m = await render({ ...base, className: 'pb-cls' })
    expect(m.host.innerHTML).toContain('pb-cls')
  })
})
