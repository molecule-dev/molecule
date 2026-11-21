// @vitest-environment jsdom
/**
 * Saved-tags display tests for the Vue tag list — the port of
 * `@molecule/app-tag-input-react/src/__tests__/tag-list.test.tsx`: the same
 * test names and the same assertions, rendered with Vue in jsdom.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h } from 'vue'

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

vi.mock('@molecule/app-vue', () => ({
  useTranslation: () => ({
    t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? _key,
  }),
}))

import { TagList } from '../TagList.js'
import type { TagListProps } from '../types.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * Mounts one tag list and returns its host element.
 *
 * @param props - The list's props.
 * @returns The mounted host.
 */
const mount = (props: TagListProps): HTMLElement => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  createApp(defineComponent({ render: () => h(TagList, props) })).mount(host)
  return host
}

/**
 * Mounts one tag list and returns its HTML, as React's static markup does.
 *
 * @param props - The list's props.
 * @returns The rendered HTML.
 */
const html = (props: TagListProps): string => mount(props).innerHTML

describe('saved tags on a destination screen', () => {
  it('renders every saved tag in its original order without requiring an editor', () => {
    const markup = html({ value: ['typescript', 'testing'] })
    expect(markup.match(/<li\b/g)).toHaveLength(2)
    expect(markup.indexOf('typescript')).toBeLessThan(markup.indexOf('testing'))
    expect(markup).not.toMatch(/<input\b|<button\b/)
  })

  it('supports a non-blog inventory detail with app-owned tag presentation', () => {
    const markup = html({
      value: ['fragile', 'cold storage'],
      className: 'inventory-labels',
      itemClassName: 'inventory-label',
      renderTag: (tag) => h('strong', tag),
    })
    expect(markup).toContain('<strong>fragile</strong>')
    expect(markup).toContain('<strong>cold storage</strong>')
    expect(markup.match(/<li\b/g)).toHaveLength(2)
    expect(markup).toContain('class="inventory-label"')
  })

  it('puts the consumer’s id, accessible name and testing hook on the list itself', () => {
    const markup = html({
      value: ['cold storage'],
      id: 'stock-conditions',
      'aria-label': 'Stock conditions',
      'data-mol-id': 'stock-conditions-list',
      className: 'stock-labels',
      renderTag: (tag) => h('span', tag),
    })
    expect(markup).toMatch(/<ul[^>]* id="stock-conditions"/)
    expect(markup).toMatch(/<ul[^>]* aria-label="Stock conditions"/)
    expect(markup).toMatch(/<ul[^>]* data-mol-id="stock-conditions-list"/)
    expect(markup).toMatch(/<ul[^>]* class="[^"]*stock-labels"/)
    expect(markup).toContain('cold storage')
  })

  it('counterexample: removing every saved tag leaves no stale tag items', () => {
    expect(html({ value: ['removed'] })).toContain('removed')
    const empty = html({ value: [] })
    expect(empty).not.toContain('<li')
    expect(empty).not.toContain('removed')
  })

  it('escapes tag text and preserves repeated labels', () => {
    const markup = html({ value: ['<script>bad</script>', 'same', 'same'] })
    expect(markup).not.toContain('<script>')
    expect(markup.match(/<li\b/g)).toHaveLength(3)
    expect(markup.match(/>same</g)).toHaveLength(2)
  })
})
