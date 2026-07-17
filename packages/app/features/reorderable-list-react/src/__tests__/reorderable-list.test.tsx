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
    // Rows carry a focusable tabindex + a position label for screen readers.
    expect(markup).toMatch(/<li[^>]*tabindex="0"/)
    expect(markup).toContain('aria-label="Item 1 of 2"')
    // First row's up + last row's down are disabled (boundary guards).
    expect(markup).toMatch(/data-mol-id="reorderable-move-up-a"[^>]*disabled/)
    expect(markup).toMatch(/data-mol-id="reorderable-move-down-b"[^>]*disabled/)
  })
})
