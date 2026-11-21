// @vitest-environment jsdom
/**
 * Locale-switch reactivity for RatingForm's comment field label and star
 * labels. `useTranslation()` from `@molecule/app-react` subscribes to the
 * provider through `useSyncExternalStore`, so the form re-renders on the
 * switch. This test bonds a provider with `en` and `de` values for the comment
 * label and the star-label format, renders in `en`, switches to `de`, and
 * asserts both strings now show the German values — the star label
 * interpolating the same `{{n}}` / `{{max}}` values in German word order.
 *
 * @module
 */
import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { I18nProvider } from '@molecule/app-i18n'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

// A ClassMap proxy echoing each accessed member back as its token — the same
// mock the React suite uses.
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
  Button: ({ children, disabled }: { children?: ReactNode; disabled?: boolean }) =>
    createElement('button', { 'data-button': '', disabled }, children),
  Textarea: (props: { placeholder?: string; 'aria-label'?: string }) =>
    createElement('textarea', {
      'data-textarea': '',
      placeholder: props.placeholder,
      'aria-label': props['aria-label'],
    }),
}))

// No mock of `@molecule/app-react`: the real useTranslation reads the bonded
// provider, which is what the switch drives.
const { RatingForm } = await import('../RatingForm.js')

/** The bonded provider from {@link beforeEach}. */
let provider: I18nProvider

let root: Root | null = null
let host: HTMLElement | null = null

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
  if (root) await act(async () => root?.unmount())
  host?.remove()
  root = null
  host = null
  // Reset the global i18n singleton to a clean English provider so a locale
  // override registered in one test can't bleed into the next.
  setProvider(createSimpleI18nProvider('en'))
})

describe('RatingForm locale switch', () => {
  it('the comment field label and star labels follow a locale switch', async () => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await act(async () => {
      root?.render(createElement(RatingForm, { onSubmit: () => {} }))
    })
    const textarea = host.querySelector('[data-textarea]')
    const firstStar = host.querySelector('[data-mol-id="rating-form-star"]')
    expect(textarea?.getAttribute('aria-label')).toBe('Comment')
    expect(firstStar?.getAttribute('aria-label')).toBe('1 of 5')

    // The switch itself: the label must follow it without an unrelated
    // re-render, and the star format must interpolate the same values.
    await act(async () => {
      await provider.setLocale('de')
    })
    expect(textarea?.getAttribute('aria-label')).toBe('Kommentar')
    expect(firstStar?.getAttribute('aria-label')).toBe('1 von 5')
  })
})
