import { createElement } from 'react'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

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

vi.mock('@molecule/app-react', () => ({
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

vi.mock('@molecule/app-ui-react', () => ({
  Button: ({
    children,
    disabled,
    ['aria-label']: ariaLabel,
    ['aria-current']: ariaCurrent,
  }: {
    children?: ReactNode
    disabled?: boolean
    'aria-label'?: string
    'aria-current'?: string
  }) =>
    createElement(
      'button',
      { 'data-button': '', disabled, 'aria-label': ariaLabel, 'aria-current': ariaCurrent },
      children,
    ),
  Select: ({ ['aria-label']: ariaLabel }: { 'aria-label'?: string }) =>
    createElement('select', { 'data-select': '', 'aria-label': ariaLabel }),
}))

const { PaginationBar } = await import('../PaginationBar.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

const base = {
  page: 1,
  totalPages: 3,
  pageSize: 20,
  total: 50,
  onPageChange: () => {},
}

describe('PaginationBar', () => {
  it('renders the "Showing X to Y of Z" summary', () => {
    const markup = html(createElement(PaginationBar, base))
    expect(markup).toContain('Showing 1 to 20 of 50 items')
  })

  it('renders prev/next buttons and one button per page when totalPages <= 5', () => {
    const markup = html(createElement(PaginationBar, base))
    expect(markup).toContain('aria-label="Previous page"')
    expect(markup).toContain('aria-label="Next page"')
    expect(markup).toContain('>1<')
    expect(markup).toContain('>2<')
    expect(markup).toContain('>3<')
  })

  it('marks the current page with aria-current', () => {
    const markup = html(createElement(PaginationBar, { ...base, page: 2 }))
    expect(markup.match(/aria-current="page"/g) ?? []).toHaveLength(1)
  })

  it('disables Previous on the first page and Next on the last page', () => {
    const first = html(createElement(PaginationBar, { ...base, page: 1 }))
    expect(first).toMatch(/<button[^>]*disabled[^>]*aria-label="Previous page"/)
    const last = html(createElement(PaginationBar, { ...base, page: 3 }))
    expect(last).toMatch(/<button[^>]*disabled[^>]*aria-label="Next page"/)
  })

  it('renders ellipses for large page counts', () => {
    const markup = html(createElement(PaginationBar, { ...base, page: 10, totalPages: 20 }))
    expect(markup).toContain('…')
  })

  it('renders the page-size selector only when pageSizeOptions + onPageSizeChange are supplied', () => {
    const withSel = html(
      createElement(PaginationBar, {
        ...base,
        pageSizeOptions: [10, 20, 50],
        onPageSizeChange: () => {},
      }),
    )
    expect(withSel).toContain('data-select=""')
    const without = html(createElement(PaginationBar, base))
    expect(without).not.toContain('data-select')
  })

  it('forwards className', () => {
    const markup = html(createElement(PaginationBar, { ...base, className: 'pb-cls' }))
    expect(markup).toContain('pb-cls')
  })
})
