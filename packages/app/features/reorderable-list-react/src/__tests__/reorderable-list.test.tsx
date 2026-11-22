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
        // At runtime a ClassMap value IS a string (`cm.srOnly` = 'sr-only');
        // parametrized tokens stay callable (`cm.stack(1)`) but stringify to
        // their token, so frameworks that write class through String(fn)
        // (Solid, Svelte, Angular) render the token, not the function source.
        const value = (..._args: unknown[]) => token
        value.toString = () => token
        return value
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useTranslation: () => ({
    t: (
      _key: string,
      values: Record<string, unknown> | undefined,
      opts?: { defaultValue?: string },
    ) => {
      let out = opts?.defaultValue ?? _key
      if (values)
        for (const [k, v] of Object.entries(values)) out = out.replace(`{{${k}}}`, String(v))
      return out
    },
  }),
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
    expect(markup).toContain('data-item="a"')
    expect(markup).toContain('data-item="b"')
    expect(markup).toContain('Alpha')
    expect(markup).toContain('Beta')
  })

  it('renders a plain list: no role on the ul, no role or tabindex on the rows', () => {
    const markup = html(
      createElement(ReorderableList<{ label: string }>, { items, onReorder: () => {}, renderItem }),
    )
    // A `ul` already is a list (role="list" would be redundant) and a row is a
    // plain `li`: the drag handlers live on it, but it is not a focusable
    // widget — the move buttons are.
    expect(markup.match(/<ul[^>]*role=/g)).toBeNull()
    expect(markup.match(/<li[^>]*role=/g)).toBeNull()
    expect(markup.match(/<li[^>]*tabindex=/g)).toBeNull()
    expect(markup.match(/<li[^>]*aria-selected=/g)).toBeNull()
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

  it('renders keyboard-accessible move controls with aria + data-mol-id, disabled at the edges', () => {
    const markup = html(
      createElement(ReorderableList<{ label: string }>, { items, onReorder: () => {}, renderItem }),
    )
    // Every row exposes move-up/move-down buttons the finding requires.
    expect(markup).toContain('data-mol-id="reorderable-move-up-a"')
    expect(markup).toContain('data-mol-id="reorderable-move-down-a"')
    expect(markup).toContain('data-mol-id="reorderable-move-up-b"')
    expect(markup).toContain('data-mol-id="reorderable-move-down-b"')
    expect(markup).toContain('aria-label="Move up"')
    expect(markup).toContain('aria-label="Move down"')
    // First row's up + last row's down are disabled (boundary guards).
    expect(markup).toMatch(/data-mol-id="reorderable-move-up-a"[^>]*disabled/)
    expect(markup).toMatch(/data-mol-id="reorderable-move-down-b"[^>]*disabled/)
  })

  it('describes each move button with its row position, rendered in an sr-only span', () => {
    const markup = html(
      createElement(ReorderableList<{ label: string }>, { items, onReorder: () => {}, renderItem }),
    )
    // The row's position text ("Item 1 of 2") sits in a screen-reader-only
    // span as the row's last child; both of the row's move buttons point at it
    // through aria-describedby, and each row references its own span.
    const described = [...markup.matchAll(/aria-describedby="([^"]*)"/g)].map((m) => m[1])
    expect(described).toHaveLength(4)
    expect(new Set(described).size).toBe(2)
    const spans = [...markup.matchAll(/<span id="([^"]*)"[^>]*>Item (\d) of \d<\/span>/g)]
    expect(spans.map((m) => [m[1], Number(m[2])])).toEqual([
      [described[0], 1],
      [described[2], 2],
    ])
    // The position span is the row's last child.
    const rows = markup.match(/<li[\s\S]*?<\/li>/g) ?? []
    expect(rows).toHaveLength(2)
    for (const row of rows)
      expect(row).toMatch(/<span id="[^"]*"[^>]*>Item \d of \d<\/span><\/li>$/)
  })
})
