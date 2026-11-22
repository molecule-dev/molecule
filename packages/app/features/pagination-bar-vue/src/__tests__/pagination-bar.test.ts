// @vitest-environment jsdom
/**
 * Unit tests for the Vue `PaginationBar` — a port of
 * `@molecule/app-pagination-bar-react/src/__tests__/pagination-bar.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex`), so tests can assert which cm.* class was applied without a real
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

vi.mock('@molecule/app-icons', () => ({
  getIcon: () => ({ paths: [{ d: 'M0 0h1v1H0z' }], viewBox: '0 0 16 16' }),
}))

vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

import { createApp, defineComponent, h } from 'vue'

import { PaginationBar } from '../PaginationBar.js'
import type { PaginationBarProps } from '../types.js'

const mounted: HTMLElement[] = []

afterEach(() => {
  document.body.innerHTML = ''
  mounted.length = 0
})

/** Renders a {@link PaginationBar} and returns the host element it produced. */
const render = (props: PaginationBarProps): HTMLElement => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted.push(host)
  const app = createApp(defineComponent({ render: () => h(PaginationBar, props) }))
  app.mount(host)
  return host
}

const base = {
  page: 1,
  totalPages: 3,
  pageSize: 20,
  total: 50,
  onPageChange: () => {},
}

describe('PaginationBar', () => {
  it('renders the "Showing X to Y of Z" summary', () => {
    const host = render(base)
    expect(host.innerHTML).toContain('Showing 1 to 20 of 50 items')
  })

  it('renders prev/next buttons and one button per page when totalPages <= 5', () => {
    const host = render(base)
    const markup = host.innerHTML
    expect(markup).toContain('aria-label="Previous page"')
    expect(markup).toContain('aria-label="Next page"')
    expect(markup).toContain('>1<')
    expect(markup).toContain('>2<')
    expect(markup).toContain('>3<')
  })

  it('marks the current page with aria-current', () => {
    const host = render({ ...base, page: 2 })
    expect(host.innerHTML.match(/aria-current="page"/g) ?? []).toHaveLength(1)
  })

  it('disables Previous on the first page and Next on the last page', () => {
    const first = render(base).innerHTML
    expect(first).toMatch(/<button[^>]*disabled[^>]*aria-label="Previous page"/)
    const last = render({ ...base, page: 3 }).innerHTML
    expect(last).toMatch(/<button[^>]*disabled[^>]*aria-label="Next page"/)
  })

  it('renders ellipses for large page counts', () => {
    const host = render({ ...base, page: 10, totalPages: 20 })
    expect(host.innerHTML).toContain('…')
  })

  it('renders the page-size selector only when pageSizeOptions + onPageSizeChange are supplied', () => {
    const withSel = render({
      ...base,
      pageSizeOptions: [10, 20, 50],
      onPageSizeChange: () => {},
    })
    expect(withSel.querySelector('select')).not.toBeNull()
    const without = render(base)
    expect(without.querySelector('select')).toBeNull()
  })

  it('passes the selected page size to onPageSizeChange as a number, not NaN', () => {
    const onPageSizeChange = vi.fn()
    const host = render({
      ...base,
      pageSizeOptions: [10, 25, 50],
      onPageSizeChange,
    })
    const select = host.querySelector('select')
    if (!select) throw new Error('Select was never rendered')
    // Drive a real selection through the Select's change contract. The old
    // wiring parsed the DOM event instead of the typed value, so it received
    // `Number(event) === NaN`; the fix wires `onValueChange`, so the handler
    // receives `Number('25') === 25`.
    select.value = '25'
    select.dispatchEvent(new Event('change', { bubbles: true }))
    expect(onPageSizeChange).toHaveBeenCalledTimes(1)
    expect(onPageSizeChange).toHaveBeenCalledWith(25)
    expect(Number.isNaN(onPageSizeChange.mock.calls[0][0])).toBe(false)
  })

  it('renders one page-size option per entry in pageSizeOptions', () => {
    const host = render({
      ...base,
      pageSizeOptions: [10, 25, 50],
      onPageSizeChange: () => {},
    })
    const options = Array.from(host.querySelectorAll('option')).map((option) => ({
      value: option.value,
      label: option.textContent,
    }))
    expect(options).toEqual([
      { value: '10', label: '10' },
      { value: '25', label: '25' },
      { value: '50', label: '50' },
    ])
  })

  it('forwards className', () => {
    const host = render({ ...base, className: 'pb-cls' })
    expect(host.innerHTML).toContain('pb-cls')
  })
})
