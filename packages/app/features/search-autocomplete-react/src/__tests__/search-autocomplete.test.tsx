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
  Input: ({
    value,
    placeholder,
    ['aria-autocomplete']: ariaAutocomplete,
    ['aria-expanded']: ariaExpanded,
  }: {
    value?: string
    placeholder?: string
    'aria-autocomplete'?: string
    'aria-expanded'?: boolean
  }) =>
    createElement('input', {
      'data-input': '',
      value,
      placeholder,
      'aria-autocomplete': ariaAutocomplete,
      'aria-expanded': ariaExpanded,
      readOnly: true,
    }),
}))

const { SearchAutocomplete } = await import('../SearchAutocomplete.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

// The suggestion popover only opens on focus/typing — SSR covers the closed
// input surface.
describe('SearchAutocomplete (closed state)', () => {
  it('renders the search input carrying the value', () => {
    const markup = html(
      createElement(SearchAutocomplete, { value: 'react', onChange: () => {}, onSelect: () => {} }),
    )
    expect(markup).toContain('data-input=""')
    expect(markup).toContain('value="react"')
  })

  it('uses the default placeholder and honours a custom one', () => {
    expect(
      html(
        createElement(SearchAutocomplete, { value: '', onChange: () => {}, onSelect: () => {} }),
      ),
    ).toContain('placeholder="Search')
    const custom = html(
      createElement(SearchAutocomplete, {
        value: '',
        onChange: () => {},
        onSelect: () => {},
        placeholder: 'Find a project',
      }),
    )
    expect(custom).toContain('placeholder="Find a project"')
  })

  it('exposes autocomplete a11y attributes with the popover collapsed', () => {
    const markup = html(
      createElement(SearchAutocomplete, { value: '', onChange: () => {}, onSelect: () => {} }),
    )
    expect(markup).toContain('aria-autocomplete="list"')
    expect(markup).toContain('aria-expanded="false"')
  })

  it('does not render the suggestion listbox before being opened', () => {
    const markup = html(
      createElement(SearchAutocomplete, {
        value: 'q',
        onChange: () => {},
        onSelect: () => {},
        suggestions: [{ id: '1', label: 'Result one' }],
      }),
    )
    expect(markup).not.toContain('role="listbox"')
  })

  it('forwards className onto the wrapper', () => {
    const markup = html(
      createElement(SearchAutocomplete, {
        value: '',
        onChange: () => {},
        onSelect: () => {},
        className: 'sa-cls',
      }),
    )
    expect(markup).toContain('sa-cls')
  })
})
