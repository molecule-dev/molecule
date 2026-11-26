// @vitest-environment jsdom
/**
 * Unit tests for the Vue `SearchAutocomplete` (closed surface) — a port of
 * `@molecule/app-search-autocomplete-react`'s own suite: the same test names
 * and the same behavioral assertions, rendered with Vue in jsdom.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token, exactly like
// the React suite's mock, so tests assert which cm.* token was applied without
// a real styling bond.
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

// The React suite's translation mock: each key falls back to its default value.
vi.mock('@molecule/app-vue', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

// The `data-input` marker the React suite mocks `@molecule/app-ui-react` with —
// plus the a11y attributes the closed-state test asserts on.
vi.mock('@molecule/app-ui-vue', async (importOriginal) => {
  const { defineComponent, h } = await import('vue')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Input: defineComponent({
      name: 'Input',
      inheritAttrs: false,
      setup(_props, { attrs }) {
        const a = attrs as Record<string, unknown>
        return () =>
          h('input', {
            'data-input': '',
            value: a.value,
            placeholder: a.placeholder,
            role: a.role,
            'aria-label': a['aria-label'],
            'aria-autocomplete': a['aria-autocomplete'],
            'aria-expanded': a['aria-expanded'],
            readOnly: true,
          })
      },
    }),
  }
})

import { createApp, defineComponent, h } from 'vue'

import type { SearchAutocompleteProps } from '../types.js'

const { SearchAutocomplete } = await import('../SearchAutocomplete.js')

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * Renders a `SearchAutocomplete` and returns the markup it produced.
 * @param props - The component props (`value` required, the rest optional —
 * the helper supplies `onChange` and `onSelect` itself).
 * @returns The rendered markup.
 */
const render = (
  props: Partial<SearchAutocompleteProps> & Pick<SearchAutocompleteProps, 'value'>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({
      render: () => h(SearchAutocomplete, { onChange: () => {}, onSelect: () => {}, ...props }),
    }),
  )
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

describe('SearchAutocomplete (closed state)', () => {
  it('renders the search input carrying the value', () => {
    const markup = render({ value: 'react' })
    expect(markup).toContain('data-input')
    expect(markup).toContain('value="react"')
  })

  it('uses the default placeholder and honours a custom one', () => {
    expect(render({ value: '' })).toContain('placeholder="Search')
    expect(render({ value: '', placeholder: 'Find a project' })).toContain(
      'placeholder="Find a project"',
    )
  })

  it('names the input with an aria-label and honours a custom one', () => {
    // The input's only name must never rest on its placeholder (an empty one
    // leaves it nameless): the translated default names it either way.
    expect(render({ value: '', placeholder: '' })).toContain('aria-label="Search"')
    expect(render({ value: '', ariaLabel: 'Find a project' })).toContain(
      'aria-label="Find a project"',
    )
  })

  it('exposes autocomplete a11y attributes with the popover collapsed', () => {
    const markup = render({ value: '' })
    expect(markup).toContain('aria-autocomplete="list"')
    expect(markup).toContain('aria-expanded="false"')
  })

  it('does not render the suggestion listbox before being opened', () => {
    const markup = render({
      value: 'q',
      suggestions: [{ id: '1', label: 'Result one' }],
    })
    expect(markup).not.toContain('role="listbox"')
  })

  it('forwards className onto the wrapper', () => {
    expect(render({ value: '', className: 'sa-cls' })).toContain('sa-cls')
  })
})
