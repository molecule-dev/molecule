// @vitest-environment jsdom
/**
 * Unit tests for the Solid `SearchAutocomplete` (closed surface) — a port of
 * `@molecule/app-search-autocomplete-react`'s own suite: the same test names
 * and the same behavioral assertions, rendered with Solid in jsdom.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { SearchAutocompleteProps } from '../types.js'

// Proxy ClassMap echoing each accessed member back as its token, exactly like
// the React suite's mock, so tests assert which cm.* token was applied.
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

vi.mock('@molecule/app-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The `data-input` marker the React suite mocks `@molecule/app-ui-react` with,
// plus the a11y attributes the closed-state test asserts on. The mock's props
// type is exactly what the component passes, so every value reaches the
// <input> without a cast.
vi.mock('@molecule/app-ui-solid', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  Input: (props: {
    value?: string
    placeholder?: string
    role?: 'combobox'
    'aria-label'?: string
    'aria-autocomplete'?: 'list'
    'aria-expanded'?: boolean | 'true' | 'false'
  }) => (
    <input
      data-input=""
      value={props.value}
      placeholder={props.placeholder}
      role={props.role}
      aria-label={props['aria-label']}
      aria-autocomplete={props['aria-autocomplete']}
      aria-expanded={props['aria-expanded']}
      readOnly
    />
  ),
}))

const { SearchAutocomplete } = await import('../SearchAutocomplete.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/**
 * Renders a `SearchAutocomplete` and returns the markup it produced.
 * @param props - The component props (`value` required, the rest optional —
 * the helper supplies `onChange` and `onSelect` itself).
 * @returns The rendered markup.
 */
const renderView = (
  props: Partial<SearchAutocompleteProps> & Pick<SearchAutocompleteProps, 'value'>,
): string => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(
    render(
      () =>
        (<SearchAutocomplete onChange={() => {}} onSelect={() => {}} {...props} />) as JSX.Element,
      container,
    ),
  )
  const markup = container.innerHTML
  return markup
}

describe('SearchAutocomplete (closed state)', () => {
  it('renders the search input carrying the value', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    disposers.push(
      render(
        () =>
          (
            <SearchAutocomplete value="react" onChange={() => {}} onSelect={() => {}} />
          ) as JSX.Element,
        container,
      ),
    )
    const input = container.querySelector('input') as HTMLInputElement
    expect(input.hasAttribute('data-input')).toBe(true)
    // Solid writes the live `value` property (React's mock carries the
    // attribute), so the controlled value is read off the element.
    expect(input.value).toBe('react')
  })

  it('uses the default placeholder and honours a custom one', () => {
    expect(renderView({ value: '' })).toContain('placeholder="Search')
    expect(renderView({ value: '', placeholder: 'Find a project' })).toContain(
      'placeholder="Find a project"',
    )
  })

  it('names the input with an aria-label and honours a custom one', () => {
    // The input's only name must never rest on its placeholder (an empty one
    // leaves it nameless): the translated default names it either way.
    expect(renderView({ value: '', placeholder: '' })).toContain('aria-label="Search"')
    expect(renderView({ value: '', ariaLabel: 'Find a project' })).toContain(
      'aria-label="Find a project"',
    )
  })

  it('exposes autocomplete a11y attributes with the popover collapsed', () => {
    const markup = renderView({ value: '' })
    expect(markup).toContain('aria-autocomplete="list"')
    expect(markup).toContain('aria-expanded="false"')
  })

  it('does not render the suggestion listbox before being opened', () => {
    const markup = renderView({ value: 'q', suggestions: [{ id: '1', label: 'Result one' }] })
    expect(markup).not.toContain('role="listbox"')
  })

  it('forwards className onto the wrapper', () => {
    expect(renderView({ value: '', className: 'sa-cls' })).toContain('sa-cls')
  })
})
