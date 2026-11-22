/**
 * The comment field's label goes through i18n.
 *
 * Found by the pseudo-locale check: the comment textarea's `aria-label` was
 * written as the English literal `"Comment"` in the JSX, so it rendered plain
 * English in every locale. These tests mock `useTranslation` with a `t` that
 * marks every key, so a string that bypassed `t()` would show up as plain
 * English.
 *
 * @module
 */
import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

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

// Translations the bonded i18n provider would supply: each key maps to a marked
// string, so a default that bypassed t() would show up as plain English.
vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({ t: (key: string) => `«${key}»` }),
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

const { RatingForm } = await import('../RatingForm.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

describe('RatingForm i18n', () => {
  it('renders the comment field label through t', () => {
    const markup = html(createElement(RatingForm, { onSubmit: () => {} }))
    expect(markup).toContain('aria-label="«rating.comment»"')
  })

  it('an explicit commentPlaceholder overrides the translated placeholder', () => {
    const markup = html(
      createElement(RatingForm, { onSubmit: () => {}, commentPlaceholder: 'Tell us more' }),
    )
    expect(markup).toContain('placeholder="Tell us more"')
    expect(markup).not.toContain('«rating.commentPlaceholder»')
  })
})
