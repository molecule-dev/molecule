/**
 * The React `RatingDisplay`'s own text goes through i18n: its accessible names
 * are translation keys with English `defaultValue`s, so a locale bond can
 * translate them and a locale switch re-renders them.
 *
 * @module
 */

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// The same ClassMap proxy mock the main suite uses (echoing each token back).
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

// Translations the bonded i18n provider would supply: each key maps to a marked string carrying
// the interpolated values, so text that bypassed t() would show up as plain English.
vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      `«${key}|${values?.value}|${values?.max}»`,
  }),
}))

const { RatingDisplay } = await import('../RatingDisplay.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

describe('RatingDisplay i18n', () => {
  it('takes the container label through t() with the rating and max', () => {
    const markup = html(createElement(RatingDisplay, { value: 3.5 }))
    expect(markup).toContain('aria-label="«ratingDisplay.aria.rating|3.5|5»"')
    expect(markup).not.toContain('aria-label="Rating: 3.5 of 5"')
  })

  it("takes each interactive star's label through t() with the star and max", () => {
    const markup = html(createElement(RatingDisplay, { value: 2, onChange: () => {} }))
    expect(markup).toContain('aria-label="«ratingDisplay.aria.rate|1|5»"')
    expect(markup).toContain('aria-label="«ratingDisplay.aria.rate|5|5»"')
    expect(markup).not.toContain('aria-label="Rate 1 of 5"')
  })

  it('lets an explicit ariaLabel override the translated container label', () => {
    const markup = html(createElement(RatingDisplay, { value: 4, ariaLabel: 'Four stars' }))
    expect(markup).toContain('aria-label="Four stars"')
    expect(markup).not.toContain('«ratingDisplay.aria.rating')
  })
})
