// @vitest-environment jsdom
/**
 * The Svelte `RatingDisplay`'s own text goes through i18n — the port of
 * `@molecule/app-rating-display-react/src/__tests__/rating-display-i18n.test.tsx`:
 * the same test names and assertions, with the Svelte binding's
 * `useTranslation` mocked instead of React's.
 *
 * @module
 */

import { flushSync, mount, unmount } from 'svelte'
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
vi.mock('@molecule/app-svelte', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      `«${key}|${values?.value}|${values?.max}»`,
  }),
}))

import RatingDisplay from '../RatingDisplay.svelte'
import type { RatingDisplayProps } from '../types.js'

const mounted: Array<ReturnType<typeof mount>> = []

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

/**
 * Mounts the component and returns the markup it produced.
 *
 * @param props - The RatingDisplay props.
 * @returns The rendered markup.
 */
const render = (props: RatingDisplayProps): string => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  mounted.push(mount(RatingDisplay, { target, props }))
  flushSync()
  return target.innerHTML
}

describe('RatingDisplay i18n', () => {
  it('takes the container label through t() with the rating and max', () => {
    const markup = render({ value: 3.5 })
    expect(markup).toContain('aria-label="«ratingDisplay.aria.rating|3.5|5»"')
    expect(markup).not.toContain('aria-label="Rating: 3.5 of 5"')
  })

  it("takes each interactive star's label through t() with the star and max", () => {
    const markup = render({ value: 2, onChange: () => {} })
    expect(markup).toContain('aria-label="«ratingDisplay.aria.rate|1|5»"')
    expect(markup).toContain('aria-label="«ratingDisplay.aria.rate|5|5»"')
    expect(markup).not.toContain('aria-label="Rate 1 of 5"')
  })

  it('lets an explicit ariaLabel override the translated container label', () => {
    const markup = render({ value: 4, ariaLabel: 'Four stars' })
    expect(markup).toContain('aria-label="Four stars"')
    expect(markup).not.toContain('«ratingDisplay.aria.rating')
  })
})
