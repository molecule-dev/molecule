// @vitest-environment jsdom
/**
 * Unit tests for the Svelte `SearchAutocomplete` (closed surface) — a port of
 * `@molecule/app-search-autocomplete-react`'s own suite: the same test names
 * and the same behavioral assertions, rendered with a real Svelte mount in
 * jsdom.
 *
 * @module
 */

import { mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Proxy ClassMap echoing each accessed member back as its token, exactly like
// the React suite's mock, so tests assert which cm.* token was applied.
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
vi.mock('@molecule/app-svelte', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

import SearchAutocomplete from '../SearchAutocomplete.svelte'

/** The mounted instances, torn down through the dispose closure `mount` gave. */
const mounted: Array<{ dispose: () => void; target: HTMLElement }> = []

afterEach(() => {
  for (const { dispose, target } of mounted.splice(0)) {
    dispose()
    target.remove()
  }
})

/**
 * Mounts a `SearchAutocomplete` with the given props.
 * @param props - The component props.
 * @returns The target element the component rendered into.
 */
const render = (props: Record<string, unknown>): HTMLElement => {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const component = mount(SearchAutocomplete, {
    target,
    props: { value: '', onChange: () => {}, onSelect: () => {}, ...props },
  })
  mounted.push({
    target,
    dispose: () => {
      void unmount(component)
    },
  })
  return target
}

describe('SearchAutocomplete (closed state)', () => {
  it('renders the search input carrying the value', async () => {
    const host = render({ value: 'react' })
    // Svelte applies the Input's value action from a flush; one turn is enough.
    for (let i = 0; i < 5; i++) await Promise.resolve()
    const input = host.querySelector('input') as HTMLInputElement
    // The real Svelte Input applies React's input-value semantics (property +
    // reflected attribute) rather than the suite's `data-input` marker.
    expect(input.getAttribute('type')).toBe('search')
    expect(input.value).toBe('react')
  })

  it('uses the default placeholder and honours a custom one', () => {
    expect(render({ value: '' }).innerHTML).toContain('placeholder="Search')
    expect(render({ value: '', placeholder: 'Find a project' }).innerHTML).toContain(
      'placeholder="Find a project"',
    )
  })

  it('names the input with an aria-label and honours a custom one', () => {
    // The input's only name must never rest on its placeholder (an empty one
    // leaves it nameless): the translated default names it either way.
    expect(render({ value: '', placeholder: '' }).innerHTML).toContain('aria-label="Search"')
    expect(render({ value: '', ariaLabel: 'Find a project' }).innerHTML).toContain(
      'aria-label="Find a project"',
    )
  })

  it('exposes autocomplete a11y attributes with the popover collapsed', () => {
    const markup = render({ value: '' }).innerHTML
    expect(markup).toContain('aria-autocomplete="list"')
    expect(markup).toContain('aria-expanded="false"')
  })

  it('does not render the suggestion listbox before being opened', () => {
    const markup = render({ value: 'q', suggestions: [{ id: '1', label: 'Result one' }] }).innerHTML
    expect(markup).not.toContain('role="listbox"')
  })

  it('forwards className onto the wrapper', () => {
    expect(render({ value: '', className: 'sa-cls' }).innerHTML).toContain('sa-cls')
  })
})
