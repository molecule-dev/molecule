import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () =>
    new Proxy(
      {},
      {
        get: (_target, name) =>
          name === 'cn'
            ? (...values: unknown[]) => values.filter((v) => typeof v === 'string').join(' ')
            : () => String(name),
      },
    ),
}))
vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

import type { TagListProps } from '../TagList.js'
import { TagList } from '../TagList.js'

const html = (value: TagListProps): string => renderToStaticMarkup(createElement(TagList, value))

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
      renderTag: (tag) => createElement('strong', null, tag),
    })
    expect(markup).toContain('<strong>fragile</strong>')
    expect(markup).toContain('<strong>cold storage</strong>')
    expect(markup.match(/<li\b/g)).toHaveLength(2)
    expect(markup).toContain('class="inventory-label"')
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
