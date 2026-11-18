// @vitest-environment jsdom
/**
 * Markup tests for the Solid tag list — the port of
 * `@molecule/app-tag-input-react/src/__tests__/tag-list.test.tsx`: the same
 * test names and the same behavioral assertions, rendered with Solid in jsdom.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `roundedFull`), so tests can assert which cm.* class was applied without a
// real bond — the same mock the React tests use.
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

vi.mock('@molecule/app-solid', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

const { TagList } = await import('../TagList.jsx')

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/**
 * Mounts a view and returns the markup it produced.
 *
 * @param view - The view to render.
 * @returns The host's innerHTML.
 */
const renderMarkup = (view: () => JSX.Element): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  disposers.push(render(view, host))
  const markup = host.innerHTML
  return markup
}

describe('saved tags on a destination screen', () => {
  it('renders every saved tag in its original order without requiring an editor', () => {
    const markup = renderMarkup(() => <TagList value={['typescript', 'testing']} />)
    expect(markup.match(/<li\b/g)).toHaveLength(2)
    expect(markup.indexOf('typescript')).toBeLessThan(markup.indexOf('testing'))
    expect(markup).not.toMatch(/<input\b|<button\b/)
  })

  it('supports a non-blog inventory detail with app-owned tag presentation', () => {
    const markup = renderMarkup(() => (
      <TagList
        value={['fragile', 'cold storage']}
        className="inventory-labels"
        itemClassName="inventory-label"
        renderTag={(tag) => <strong>{tag}</strong>}
      />
    ))
    expect(markup).toContain('<strong>fragile</strong>')
    expect(markup).toContain('<strong>cold storage</strong>')
    expect(markup.match(/<li\b/g)).toHaveLength(2)
    expect(markup).toContain('class="inventory-label"')
  })

  it('counterexample: removing every saved tag leaves no stale tag items', () => {
    expect(renderMarkup(() => <TagList value={['removed']} />)).toContain('removed')
    const empty = renderMarkup(() => <TagList value={[]} />)
    expect(empty).not.toContain('<li')
    expect(empty).not.toContain('removed')
  })

  it('escapes tag text and preserves repeated labels', () => {
    const markup = renderMarkup(() => <TagList value={['<script>bad</script>', 'same', 'same']} />)
    expect(markup).not.toContain('<script>')
    expect(markup.match(/<li\b/g)).toHaveLength(3)
    expect(markup.match(/>same</g)).toHaveLength(2)
  })
})
