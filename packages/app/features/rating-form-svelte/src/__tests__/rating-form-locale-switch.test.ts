// @vitest-environment jsdom
/**
 * Locale-switch reactivity for the Svelte `RatingForm`'s comment field label
 * and star labels — the Svelte port of
 * `@molecule/app-rating-form-react/src/__tests__/rating-form-locale-switch.test.tsx`:
 * the same test name and assertion. Every `t(…)` in the component runs inside
 * a `$derived` that reads the i18n version, so the form re-renders on the
 * switch. This test bonds a provider with `en` and `de` values for the comment
 * label and the star-label format, renders in `en`, switches to `de`, and
 * asserts both strings now show the German values.
 *
 * @module
 */
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

// A ClassMap proxy echoing each accessed member back as its token — the same
// mock the Svelte suite uses.
// The kit's Input, Select and Textarea read `fieldLayout` from this module, so the actual module
// stays and only the ClassMap is replaced.
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

import RatingForm from '../RatingForm.svelte'
import type { RatingFormProps } from '../types.js'

/** The bonded provider from {@link beforeEach}, so the switch drives the exact provider the component's `t` resolves against. */
let provider: I18nProvider

const mounted: Array<ReturnType<typeof mount>> = []

beforeEach(() => {
  provider = createSimpleI18nProvider('en', [
    {
      code: 'en',
      name: 'English',
      translations: { 'rating.comment': 'Comment', 'rating.star': '{{n}} of {{max}}' },
    },
    {
      code: 'de',
      name: 'German',
      translations: { 'rating.comment': 'Kommentar', 'rating.star': '{{n}} von {{max}}' },
    },
  ])
  setProvider(provider)
})

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('RatingForm locale switch', () => {
  it('the comment field label and star labels follow a locale switch', async () => {
    const target = document.createElement('div')
    document.body.appendChild(target)
    mounted.push(mount(RatingForm, { target, props: { onSubmit: () => {} } as RatingFormProps }))
    flushSync()
    const textarea = target.querySelector('[data-textarea], textarea')
    const firstStar = target.querySelector('[data-mol-id="rating-form-star"]')
    expect(textarea?.getAttribute('aria-label')).toBe('Comment')
    expect(firstStar?.getAttribute('aria-label')).toBe('1 of 5')

    // The switch itself: the label must follow it without an unrelated
    // re-render, and the star format must interpolate the same values.
    await provider.setLocale('de')
    flushSync()

    expect(textarea?.getAttribute('aria-label')).toBe('Kommentar')
    expect(firstStar?.getAttribute('aria-label')).toBe('1 von 5')
  })
})
