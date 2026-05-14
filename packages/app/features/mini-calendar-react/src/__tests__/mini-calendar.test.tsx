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

vi.mock('@molecule/app-ui-react', () => ({
  Button: ({
    children,
    ['aria-label']: ariaLabel,
  }: {
    children?: ReactNode
    'aria-label'?: string
  }) => createElement('button', { 'data-button': '', 'aria-label': ariaLabel }, children),
}))

const { MiniCalendar } = await import('../MiniCalendar.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

// Pin the visible month to March 2026 for deterministic grid output.
const march2026 = new Date(2026, 2, 15)

describe('MiniCalendar', () => {
  it('renders the visible month name in the header', () => {
    const markup = html(createElement(MiniCalendar, { month: march2026, locale: 'en-US' }))
    expect(markup).toContain('March 2026')
  })

  it('renders previous/next month navigation buttons', () => {
    const markup = html(createElement(MiniCalendar, { month: march2026 }))
    expect(markup).toContain('aria-label="Previous month"')
    expect(markup).toContain('aria-label="Next month"')
  })

  it('renders a 6×7 day grid (42 day buttons)', () => {
    const markup = html(createElement(MiniCalendar, { month: march2026 }))
    expect(markup.match(/<button(?![^>]*aria-label="(Previous|Next) month")/g) ?? []).toHaveLength(
      42,
    )
  })

  it('marks the selected day with aria-current="date"', () => {
    const markup = html(
      createElement(MiniCalendar, { month: march2026, selected: new Date(2026, 2, 10) }),
    )
    expect(markup.match(/aria-current="date"/g) ?? []).toHaveLength(1)
  })

  it('disables days rejected by the isDisabled predicate', () => {
    const markup = html(
      createElement(MiniCalendar, {
        month: march2026,
        isDisabled: (d) => d.getDate() === 10 && d.getMonth() === 2,
      }),
    )
    expect(markup).toMatch(/<button[^>]*disabled/)
  })

  it('forwards className', () => {
    const markup = html(createElement(MiniCalendar, { month: march2026, className: 'mc-cls' }))
    expect(markup).toContain('mc-cls')
  })
})
