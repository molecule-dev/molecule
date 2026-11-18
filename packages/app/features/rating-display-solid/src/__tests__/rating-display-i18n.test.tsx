// @vitest-environment jsdom
/**
 * The Solid `RatingDisplay`'s own text goes through i18n — the port of
 * `@molecule/app-rating-display-react/src/__tests__/rating-display-i18n.test.tsx`:
 * the same test names and assertions, with the Solid binding's
 * `useTranslation` mocked instead of React's.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
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

// Translations the bonded i18n provider would supply: each key maps to a marked string carrying
// the interpolated values, so text that bypassed t() would show up as plain English.
vi.mock('@molecule/app-solid', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      `«${key}|${values?.value}|${values?.max}»`,
  }),
}))

const { RatingDisplay } = await import('../RatingDisplay.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/**
 * Renders with Solid's browser renderer and disposes after the test.
 *
 * @param view - The view to mount.
 * @returns The container the view was mounted into.
 */
const mountView = (view: () => JSX.Element): HTMLElement => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
}

describe('RatingDisplay i18n', () => {
  it('takes the container label through t() with the rating and max', () => {
    const container = mountView(() => <RatingDisplay value={3.5} />)
    expect(container.innerHTML).toContain('aria-label="«ratingDisplay.aria.rating|3.5|5»"')
    expect(container.innerHTML).not.toContain('aria-label="Rating: 3.5 of 5"')
  })

  it("takes each interactive star's label through t() with the star and max", () => {
    const container = mountView(() => <RatingDisplay value={2} onChange={() => {}} />)
    expect(container.innerHTML).toContain('aria-label="«ratingDisplay.aria.rate|1|5»"')
    expect(container.innerHTML).toContain('aria-label="«ratingDisplay.aria.rate|5|5»"')
    expect(container.innerHTML).not.toContain('aria-label="Rate 1 of 5"')
  })

  it('lets an explicit ariaLabel override the translated container label', () => {
    const container = mountView(() => <RatingDisplay value={4} ariaLabel="Four stars" />)
    expect(container.innerHTML).toContain('aria-label="Four stars"')
    expect(container.innerHTML).not.toContain('«ratingDisplay.aria.rating')
  })
})
