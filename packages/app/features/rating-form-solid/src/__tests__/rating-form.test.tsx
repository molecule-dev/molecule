// @vitest-environment jsdom
/**
 * Unit tests for the Solid `RatingForm` — a port of
 * `@molecule/app-rating-form-react/src/__tests__/rating-form.test.tsx`: the
 * same behavioral assertions, rendered with Solid in jsdom and asserted on the
 * markup the component produces.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* class was applied without a real
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

// The React suite's translation mock: each key falls back to its default value.
vi.mock('@molecule/app-solid', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The UI markers the React suite mocks `@molecule/app-ui-react` with: a
// `data-button` button and a `data-textarea` field.
vi.mock('@molecule/app-ui-solid', () => ({
  Button: (props: { children?: JSX.Element; disabled?: boolean; type?: string }) => (
    <button data-button="" type={props.type ?? 'button'} disabled={props.disabled}>
      {props.children}
    </button>
  ),
  Textarea: (props: { placeholder?: string; 'aria-label'?: string }) => (
    <textarea data-textarea="" placeholder={props.placeholder} aria-label={props['aria-label']} />
  ),
}))

const { RatingForm } = await import('../RatingForm.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/** Renders a {@link RatingForm} and returns the container it rendered into. */
function mount(props: Record<string, unknown> = {}): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <RatingForm onSubmit={() => {}} {...props} />, container))
  return container
}

describe('RatingForm', () => {
  it('renders the title when present and omits it otherwise', () => {
    expect(mount({ title: 'Rate us' }).innerHTML).toContain('Rate us')
    expect(mount().innerHTML).not.toContain('<h3')
  })

  it('renders a radiogroup with one star button per max', () => {
    const markup = mount({ max: 5 }).innerHTML
    expect(markup).toContain('role="radiogroup"')
    expect(markup.match(/role="radio"/g) ?? []).toHaveLength(5)
  })

  it('marks the defaultRating star aria-checked', () => {
    const markup = mount({ defaultRating: 3 }).innerHTML
    expect(markup.match(/aria-checked="true"/g) ?? []).toHaveLength(1)
  })

  it('renders the comment textarea with a default placeholder', () => {
    const markup = mount().innerHTML
    expect(markup).toContain('data-textarea=""')
    expect(markup).toContain('Share your thoughts')
  })

  it('disables the submit button until a rating is chosen', () => {
    const noRating = mount().innerHTML
    expect(noRating).toMatch(/<button[^>]*data-button=""[^>]*disabled/)
    const withRating = mount({ defaultRating: 4 }).innerHTML
    expect(withRating).not.toMatch(/<button[^>]*data-button=""[^>]*disabled/)
  })

  it('honours a custom submitLabel and forwards className', () => {
    const markup = mount({
      defaultRating: 4,
      submitLabel: 'Post review',
      className: 'rf-cls',
    }).innerHTML
    expect(markup).toContain('Post review')
    expect(markup).toContain('rf-cls')
  })
})
