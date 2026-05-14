import { createElement } from 'react'
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

const { RatingDisplay } = await import('../RatingDisplay.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

describe('RatingDisplay', () => {
  it('renders one star svg per max with role="img" and a default aria-label', () => {
    const markup = html(createElement(RatingDisplay, { value: 3.5, max: 5 }))
    expect(markup.match(/<svg/g) ?? []).toHaveLength(5)
    expect(markup).toContain('role="img"')
    expect(markup).toContain('aria-label="Rating: 3.5 of 5"')
  })

  it('honours a custom ariaLabel', () => {
    const markup = html(createElement(RatingDisplay, { value: 4, ariaLabel: 'Four stars' }))
    expect(markup).toContain('aria-label="Four stars"')
  })

  it('renders the review count as plain text by default', () => {
    const markup = html(createElement(RatingDisplay, { value: 4, reviewCount: 128 }))
    expect(markup).toContain('(128)')
    expect(markup).not.toContain('<button')
  })

  it('renders the review count as a button when onReviewsClick is supplied', () => {
    const markup = html(
      createElement(RatingDisplay, { value: 4, reviewCount: 128, onReviewsClick: () => {} }),
    )
    expect(markup).toContain('<button')
    expect(markup).toContain('(128)')
  })

  it('renders interactive star buttons when onChange is supplied', () => {
    const markup = html(createElement(RatingDisplay, { value: 2, max: 5, onChange: () => {} }))
    expect(markup.match(/<button/g) ?? []).toHaveLength(5)
    expect(markup).toContain('aria-label="Rate 1 of 5"')
    expect(markup).toContain('aria-label="Rate 5 of 5"')
  })

  it('forwards className', () => {
    const markup = html(createElement(RatingDisplay, { value: 3, className: 'rd-cls' }))
    expect(markup).toContain('rd-cls')
  })
})
