// @vitest-environment jsdom
/**
 * Unit tests for the Vue `RatingDisplay` — a port of
 * `@molecule/app-rating-display-react/src/__tests__/rating-display.test.tsx`:
 * the same behavioral assertions, rendered with Vue in jsdom and asserted on
 * the markup the component produces.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `flex`), so tests can assert which cm.* class was applied without a real
// bond — the same mock the React tests use.
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

import { createApp, defineComponent, h } from 'vue'

import { RatingDisplay } from '../RatingDisplay.js'
import type { RatingDisplayProps } from '../types.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * Renders a {@link RatingDisplay} and returns the markup it produced.
 *
 * @param props - The RatingDisplay props.
 * @returns The rendered markup.
 */
const render = (props: RatingDisplayProps): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(RatingDisplay, props) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('RatingDisplay', () => {
  it('renders one star svg per max with role="img" and a default aria-label', () => {
    const markup = render({ value: 3.5, max: 5 })
    expect(markup.match(/<svg/g) ?? []).toHaveLength(5)
    expect(markup).toContain('role="img"')
    expect(markup).toContain('aria-label="Rating: 3.5 of 5"')
  })

  it('honours a custom ariaLabel', () => {
    const markup = render({ value: 4, ariaLabel: 'Four stars' })
    expect(markup).toContain('aria-label="Four stars"')
  })

  it('renders the review count as plain text by default', () => {
    const markup = render({ value: 4, reviewCount: 128 })
    expect(markup).toContain('(128)')
    expect(markup).not.toContain('<button')
  })

  it('renders the review count as a button when onReviewsClick is supplied', () => {
    const markup = render({ value: 4, reviewCount: 128, onReviewsClick: () => {} })
    expect(markup).toContain('<button')
    expect(markup).toContain('(128)')
  })

  it('renders interactive star buttons when onChange is supplied', () => {
    const markup = render({ value: 2, max: 5, onChange: () => {} })
    expect(markup.match(/<button/g) ?? []).toHaveLength(5)
    expect(markup).toContain('aria-label="Rate 1 of 5"')
    expect(markup).toContain('aria-label="Rate 5 of 5"')
  })

  it('forwards className', () => {
    const markup = render({ value: 3, className: 'rd-cls' })
    expect(markup).toContain('rd-cls')
  })

  it('keeps the rating label and role on the inner stars span, not the root', () => {
    const markup = render({ value: 3.5, max: 5 })
    expect(markup.match(/role="img"/g) ?? []).toHaveLength(1)
    expect(markup).toContain('aria-label="Rating: 3.5 of 5"')
  })

  it('groups the interactive stars under the rating label with pressed states', () => {
    const markup = render({ value: 2.4, max: 5, onChange: () => {} })
    expect(markup.match(/role="group"/g) ?? []).toHaveLength(1)
    expect(markup.match(/role="img"/g) ?? []).toHaveLength(0)
    expect(markup).toContain('aria-label="Rating: 2.4 of 5"')
    // Math.round(2.4) = 2: the first two stars pressed, the other three not.
    expect(markup.match(/aria-pressed="true"/g) ?? []).toHaveLength(2)
    expect(markup.match(/aria-pressed="false"/g) ?? []).toHaveLength(3)
  })
})
