// @vitest-environment jsdom
/**
 * The comment field's label goes through i18n — the Svelte port of
 * `@molecule/app-rating-form-react/src/__tests__/rating-form-i18n.test.tsx`:
 * the same test names and assertions, rendered with a real Svelte mount in
 * jsdom. The React original had the label as the English literal `"Comment"`
 * in its JSX (found by the pseudo-locale check); these tests mock
 * `useTranslation` with a `t` that marks every key, so a string that bypassed
 * `t()` would show up as plain English.
 *
 * @module
 */
import { mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

// Translations the bonded i18n provider would supply: each key maps to a
// marked string, so a default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
}))

import RatingForm from '../RatingForm.svelte'
import type { RatingFormProps } from '../types.js'

const mounted: Array<ReturnType<typeof mount>> = []

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

/**
 * Mounts `RatingForm` with the given props.
 *
 * @param props - The component props, beyond the required `onSubmit`.
 * @returns The container element.
 */
function render(props: Omit<Partial<RatingFormProps>, 'onSubmit'> = {}): HTMLElement {
  const target = document.createElement('div')
  document.body.appendChild(target)
  mounted.push(mount(RatingForm, { target, props: { onSubmit: () => {}, ...props } }))
  return target
}

describe('RatingForm i18n', () => {
  it('renders the comment field label through t', () => {
    expect(render().innerHTML).toContain('aria-label="«rating.comment»"')
  })

  it('an explicit commentPlaceholder overrides the translated placeholder', () => {
    const markup = render({ commentPlaceholder: 'Tell us more' }).innerHTML
    expect(markup).toContain('placeholder="Tell us more"')
    expect(markup).not.toContain('«rating.commentPlaceholder»')
  })
})
