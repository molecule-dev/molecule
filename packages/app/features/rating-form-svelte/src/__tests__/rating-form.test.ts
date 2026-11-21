// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `RatingForm` — a port of
 * `@molecule/app-rating-form-react/src/__tests__/rating-form.test.tsx`: the
 * same behavioral assertions, rendered with a real Svelte mount (jsdom) and
 * asserted on the markup the component produces.
 *
 * @module
 */

import { mount, unmount } from 'svelte'
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
vi.mock('@molecule/app-svelte', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The real `@molecule/app-ui-svelte` Textarea/Button render against the mocked
// ClassMap and translations above — the same observable markup the React
// suite's UI mocks produce (`data-textarea`, `data-button`, the placeholder and
// the button text).

import RatingForm from '../RatingForm.svelte'
import type { RatingFormProps } from '../types.js'

interface Mounted {
  // The mount() return as Svelte infers it from this component, not through
  // explicit generics: a props-only parameterization names the wrong type.
  component: ReturnType<typeof mount>
  target: HTMLElement
}

const mounted: Mounted[] = []

afterEach(() => {
  for (const { component, target } of mounted.splice(0)) {
    void unmount(component)
    target.remove()
  }
})

/**
 * Mounts `RatingForm` with the given props.
 *
 * @param props - The component props, beyond the required `onSubmit`.
 * @returns The mounted instance and its target element.
 */
function render(props: Omit<Partial<RatingFormProps>, 'onSubmit'> = {}): Mounted {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const fullProps: RatingFormProps = { onSubmit: () => {}, ...props }
  const component = mount(RatingForm, { target, props: fullProps })
  const entry = { component, target }
  mounted.push(entry)
  return entry
}

describe('RatingForm', () => {
  it('renders the title when present and omits it otherwise', () => {
    expect(render({ title: 'Rate us' }).target.innerHTML).toContain('Rate us')
    expect(render().target.innerHTML).not.toContain('<h3')
  })

  it('renders a radiogroup with one star button per max', () => {
    const markup = render({ max: 5 }).target.innerHTML
    expect(markup).toContain('role="radiogroup"')
    expect(markup.match(/role="radio"/g) ?? []).toHaveLength(5)
  })

  it('renders a focusable radiogroup', () => {
    const group = render().target.innerHTML.match(/<div[^>]*role="radiogroup"[^>]*>/)?.[0] ?? ''
    // Focusable so jsx-a11y's interactive-supports-focus is satisfied (the
    // group carries onmouseleave), but never a tab stop: -1 keeps it out of
    // the tab order, and the stars carry the keyboard instead.
    expect(group).toContain('tabindex="-1"')
  })

  it('marks the defaultRating star aria-checked', () => {
    const markup = render({ defaultRating: 3 }).target.innerHTML
    expect(markup.match(/aria-checked="true"/g) ?? []).toHaveLength(1)
  })

  it('renders the comment textarea with a default placeholder', () => {
    const markup = render().target.innerHTML
    expect(markup).toContain('<textarea')
    expect(markup).toContain('Share your thoughts')
  })

  it('disables the submit button until a rating is chosen', () => {
    const noRating = render().target.innerHTML
    expect(noRating).toMatch(/<button[^>]*disabled/)
    const withRating = render({ defaultRating: 4 }).target.innerHTML
    expect(withRating).not.toMatch(/<button[^>]*disabled/)
  })

  it('honours a custom submitLabel and forwards className', () => {
    const markup = render({ defaultRating: 4, submitLabel: 'Post review', className: 'rf-cls' })
      .target.innerHTML
    expect(markup).toContain('Post review')
    expect(markup).toContain('rf-cls')
  })
})
