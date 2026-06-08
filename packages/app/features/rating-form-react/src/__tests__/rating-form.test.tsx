import type { ReactNode } from 'react'
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

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

vi.mock('@molecule/app-ui-react', () => ({
  Button: ({ children, disabled }: { children?: ReactNode; disabled?: boolean }) =>
    createElement('button', { 'data-button': '', disabled }, children),
  Textarea: ({
    placeholder,
    ['aria-label']: ariaLabel,
  }: {
    placeholder?: string
    'aria-label'?: string
  }) => createElement('textarea', { 'data-textarea': '', placeholder, 'aria-label': ariaLabel }),
}))

const { RatingForm } = await import('../RatingForm.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

describe('RatingForm', () => {
  it('renders the title when present and omits it otherwise', () => {
    expect(html(createElement(RatingForm, { onSubmit: () => {}, title: 'Rate us' }))).toContain(
      'Rate us',
    )
    expect(html(createElement(RatingForm, { onSubmit: () => {} }))).not.toContain('<h3')
  })

  it('renders a radiogroup with one star button per max', () => {
    const markup = html(createElement(RatingForm, { onSubmit: () => {}, max: 5 }))
    expect(markup).toContain('role="radiogroup"')
    expect(markup.match(/role="radio"/g) ?? []).toHaveLength(5)
  })

  it('marks the defaultRating star aria-checked', () => {
    const markup = html(createElement(RatingForm, { onSubmit: () => {}, defaultRating: 3 }))
    expect(markup.match(/aria-checked="true"/g) ?? []).toHaveLength(1)
  })

  it('renders the comment textarea with a default placeholder', () => {
    const markup = html(createElement(RatingForm, { onSubmit: () => {} }))
    expect(markup).toContain('data-textarea=""')
    expect(markup).toContain('Share your thoughts')
  })

  it('disables the submit button until a rating is chosen', () => {
    const noRating = html(createElement(RatingForm, { onSubmit: () => {} }))
    expect(noRating).toMatch(/<button[^>]*data-button=""[^>]*disabled/)
    const withRating = html(createElement(RatingForm, { onSubmit: () => {}, defaultRating: 4 }))
    expect(withRating).not.toMatch(/<button[^>]*data-button=""[^>]*disabled/)
  })

  it('honours a custom submitLabel and forwards className', () => {
    const markup = html(
      createElement(RatingForm, {
        onSubmit: () => {},
        defaultRating: 4,
        submitLabel: 'Post review',
        className: 'rf-cls',
      }),
    )
    expect(markup).toContain('Post review')
    expect(markup).toContain('rf-cls')
  })
})
