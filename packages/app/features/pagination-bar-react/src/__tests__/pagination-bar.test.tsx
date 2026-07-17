import type { ReactNode } from 'react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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

/**
 * Props the last-rendered mock `<Select>` received. Captured so a test can
 * drive a selection through the *same* handler contract the real
 * `@molecule/app-ui-react` `<Select>` exposes (see {@link selectValue}), rather
 * than a mock that swallows every handler and hides wiring bugs.
 */
interface CapturedSelectProps {
  value?: string
  options?: { value: string; label: string }[]
  onValueChange?: (value: string) => void
  onChange?: (event: unknown) => void
}
let lastSelectProps: CapturedSelectProps | null = null

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
  Select: ({
    ['aria-label']: ariaLabel,
    ...props
  }: CapturedSelectProps & { 'aria-label'?: string }) => {
    lastSelectProps = props
    return createElement('select', { 'data-select': '', 'aria-label': ariaLabel })
  },
}))

/**
 * Reproduces the real `@molecule/app-ui-react` `<Select>` change dispatch
 * (react-ui/src/components/Select.tsx `handleChange`): a user selection calls
 * `onChange` with the raw DOM **event** and `onValueChange` with the typed
 * string **value**. Whichever prop `PaginationBar` wired its numeric parser to
 * therefore decides what `onPageSizeChange` receives — wiring the parser to
 * `onChange` yields `Number(event) === NaN`.
 * @param value - The option value the user selects (e.g. `'25'`).
 */
function selectValue(value: string): void {
  if (!lastSelectProps) throw new Error('Select was never rendered')
  const event = { target: { value } }
  lastSelectProps.onChange?.(event)
  lastSelectProps.onValueChange?.(value)
}

const { PaginationBar } = await import('../PaginationBar.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

const base = {
  page: 1,
  totalPages: 3,
  pageSize: 20,
  total: 50,
  onPageChange: () => {},
}

describe('PaginationBar', () => {
  beforeEach(() => {
    lastSelectProps = null
  })

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

  it('passes the selected page size to onPageSizeChange as a number, not NaN', () => {
    const onPageSizeChange = vi.fn()
    html(
      createElement(PaginationBar, {
        ...base,
        pageSizeOptions: [10, 25, 50],
        onPageSizeChange,
      }),
    )
    // Drive a real selection through the Select's change contract. The old
    // wiring passed this parser to `onChange` (the DOM event), so it received
    // `Number(event) === NaN`; the fix wires it to `onValueChange` (the string
    // value), so it receives `Number('25') === 25`.
    selectValue('25')
    expect(onPageSizeChange).toHaveBeenCalledTimes(1)
    expect(onPageSizeChange).toHaveBeenCalledWith(25)
    expect(Number.isNaN(onPageSizeChange.mock.calls[0][0])).toBe(false)
  })

  it('renders one page-size option per entry in pageSizeOptions', () => {
    html(
      createElement(PaginationBar, {
        ...base,
        pageSizeOptions: [10, 25, 50],
        onPageSizeChange: () => {},
      }),
    )
    expect(lastSelectProps?.options).toEqual([
      { value: '10', label: '10' },
      { value: '25', label: '25' },
      { value: '50', label: '50' },
    ])
  })

  it('forwards className', () => {
    const markup = html(createElement(PaginationBar, { ...base, className: 'pb-cls' }))
    expect(markup).toContain('pb-cls')
  })
})
