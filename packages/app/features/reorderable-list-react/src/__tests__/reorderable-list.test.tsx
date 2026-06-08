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

const { ReorderableList } = await import('../ReorderableList.js')

const html = (el: Parameters<typeof renderToStaticMarkup>[0]): string => renderToStaticMarkup(el)

const items = [
  { id: 'a', data: { label: 'Alpha' } },
  { id: 'b', data: { label: 'Beta' } },
]
const renderItem = (it: {
  id: string
  data: { label: string }
}): ReturnType<typeof createElement> => createElement('span', { 'data-item': it.id }, it.data.label)

describe('ReorderableList', () => {
  it('renders a list with one row per item', () => {
    const markup = html(
      createElement(ReorderableList<{ label: string }>, { items, onReorder: () => {}, renderItem }),
    )
    expect(markup).toContain('role="list"')
    expect(markup).toContain('data-item="a"')
    expect(markup).toContain('data-item="b"')
    expect(markup).toContain('Alpha')
    expect(markup).toContain('Beta')
  })

  it('makes the whole row draggable when no renderHandle is supplied', () => {
    const markup = html(
      createElement(ReorderableList<{ label: string }>, { items, onReorder: () => {}, renderItem }),
    )
    expect(markup.match(/<li[^>]*draggable="true"/g) ?? []).toHaveLength(2)
  })

  it('renders a drag handle and non-draggable rows when renderHandle is supplied', () => {
    const markup = html(
      createElement(ReorderableList<{ label: string }>, {
        items,
        onReorder: () => {},
        renderItem,
        renderHandle: () => createElement('span', { 'data-handle': '' }, '≡'),
      }),
    )
    expect(markup).toContain('data-handle=""')
    expect(markup).toContain('aria-label="Drag to reorder"')
    expect(markup).not.toMatch(/<li[^>]*draggable="true"/)
  })

  it('forwards className onto the <ul>', () => {
    const markup = html(
      createElement(ReorderableList<{ label: string }>, {
        items,
        onReorder: () => {},
        renderItem,
        className: 'rl-cls',
      }),
    )
    expect(markup).toContain('rl-cls')
  })
})
