// @vitest-environment jsdom

/**
 * Keyboard-reordering behavior (the L115b fix): the list must be reorderable
 * without a mouse. These render into jsdom and drive the real move controls +
 * the Alt+Arrow key path, asserting `onReorder` fires with the reordered array,
 * that every move button announces its row's position, and that focus follows
 * the item after a move.
 *
 * @module
 */

import { cleanup, fireEvent, render } from '@testing-library/react'
import { createElement, type ReactElement, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

interface Row {
  label: string
}
const makeItems = (): { id: string; data: Row }[] => [
  { id: 'a', data: { label: 'Alpha' } },
  { id: 'b', data: { label: 'Beta' } },
  { id: 'c', data: { label: 'Gamma' } },
]
const renderRow = (it: { id: string; data: Row }): ReturnType<typeof createElement> =>
  createElement('span', { 'data-item': it.id }, it.data.label)

const order = (call: unknown): string[] => (call as { id: string }[]).map((i) => i.id)

afterEach(() => cleanup())

describe('ReorderableList keyboard reordering (L115b)', () => {
  it('moves an item DOWN when its move-down button is activated (no mouse)', () => {
    const onReorder = vi.fn()
    const { container } = render(
      createElement(ReorderableList<Row>, {
        items: makeItems(),
        onReorder,
        renderItem: renderRow,
      }),
    )
    const down = container.querySelector(
      '[data-mol-id="reorderable-move-down-a"]',
    ) as HTMLButtonElement
    fireEvent.click(down)
    expect(onReorder).toHaveBeenCalledTimes(1)
    expect(order(onReorder.mock.calls[0][0])).toEqual(['b', 'a', 'c'])
  })

  it('moves an item UP when its move-up button is activated', () => {
    const onReorder = vi.fn()
    const { container } = render(
      createElement(ReorderableList<Row>, {
        items: makeItems(),
        onReorder,
        renderItem: renderRow,
      }),
    )
    const up = container.querySelector('[data-mol-id="reorderable-move-up-c"]') as HTMLButtonElement
    fireEvent.click(up)
    expect(order(onReorder.mock.calls[0][0])).toEqual(['a', 'c', 'b'])
  })

  it('reorders via Alt+ArrowDown / Alt+ArrowUp on a move button; plain arrows do NOT', () => {
    const onReorder = vi.fn()
    const { container } = render(
      createElement(ReorderableList<Row>, {
        items: makeItems(),
        onReorder,
        renderItem: renderRow,
      }),
    )
    const downA = container.querySelector(
      '[data-mol-id="reorderable-move-down-a"]',
    ) as HTMLButtonElement
    fireEvent.keyDown(downA, { key: 'ArrowDown', altKey: true })
    expect(order(onReorder.mock.calls[0][0])).toEqual(['b', 'a', 'c'])

    const upC = container.querySelector(
      '[data-mol-id="reorderable-move-up-c"]',
    ) as HTMLButtonElement
    fireEvent.keyDown(upC, { key: 'ArrowUp', altKey: true })
    expect(order(onReorder.mock.calls[1][0])).toEqual(['a', 'c', 'b'])

    // A plain arrow (no Alt) and an unrelated Alt+letter must not reorder —
    // the shortcut is Alt+Arrow on the button, nothing else.
    onReorder.mockClear()
    fireEvent.keyDown(downA, { key: 'ArrowDown' })
    fireEvent.keyDown(downA, { key: 'a', altKey: true })
    expect(onReorder).not.toHaveBeenCalled()
  })

  it('describes each move button with its row position', () => {
    const { getByRole } = render(
      createElement(ReorderableList<Row>, {
        items: makeItems(),
        onReorder: () => {},
        renderItem: renderRow,
      }),
    )
    // The accessible description of a row's move buttons is that row's
    // position ("Item 2 of 3"), taken from the row's sr-only position span.
    expect(
      getByRole('button', { name: 'Move down', description: 'Item 2 of 3' }).getAttribute(
        'data-mol-id',
      ),
    ).toBe('reorderable-move-down-b')
    expect(
      getByRole('button', { name: 'Move up', description: 'Item 2 of 3' }).getAttribute(
        'data-mol-id',
      ),
    ).toBe('reorderable-move-up-b')
    expect(
      getByRole('button', { name: 'Move up', description: 'Item 3 of 3' }).getAttribute(
        'data-mol-id',
      ),
    ).toBe('reorderable-move-up-c')
  })

  it('disables and does not fire from the boundary buttons', () => {
    const onReorder = vi.fn()
    const { container } = render(
      createElement(ReorderableList<Row>, {
        items: makeItems(),
        onReorder,
        renderItem: renderRow,
      }),
    )
    const firstUp = container.querySelector(
      '[data-mol-id="reorderable-move-up-a"]',
    ) as HTMLButtonElement
    const lastDown = container.querySelector(
      '[data-mol-id="reorderable-move-down-c"]',
    ) as HTMLButtonElement
    expect(firstUp.disabled).toBe(true)
    expect(lastDown.disabled).toBe(true)
    fireEvent.click(firstUp)
    fireEvent.click(lastDown)
    expect(onReorder).not.toHaveBeenCalled()
  })
})

/** Feeds `onReorder`'s result back into `items`, the way an app owns the order. */
function StatefulList(): ReactElement {
  const [items, setItems] = useState(makeItems())
  return createElement(ReorderableList<Row>, { items, onReorder: setItems, renderItem: renderRow })
}

describe('ReorderableList focus follows the item', () => {
  it('a move that disables the used button leaves focus on that item’s other button', () => {
    const { container } = render(createElement(StatefulList))
    // Row 2 of 3's "Move down" moves `b` to the end: its move-down disables,
    // and focus settles on the same item's move-up.
    const down = container.querySelector(
      '[data-mol-id="reorderable-move-down-b"]',
    ) as HTMLButtonElement
    down.focus()
    expect(document.activeElement).toBe(down)
    fireEvent.click(down)
    const up = container.querySelector('[data-mol-id="reorderable-move-up-b"]') as HTMLButtonElement
    expect(up.disabled).toBe(false)
    expect(document.activeElement).toBe(up)
  })

  it('a move that keeps the used button enabled keeps focus on it', () => {
    const { container } = render(createElement(StatefulList))
    // Row 1 of 3's "Move down" moves `a` into the middle: the same button stays
    // enabled (the row is keyed by item id, so it moves with its row).
    const down = container.querySelector(
      '[data-mol-id="reorderable-move-down-a"]',
    ) as HTMLButtonElement
    down.focus()
    expect(document.activeElement).toBe(down)
    fireEvent.click(down)
    const downAfter = container.querySelector(
      '[data-mol-id="reorderable-move-down-a"]',
    ) as HTMLButtonElement
    expect(downAfter.disabled).toBe(false)
    expect(document.activeElement).toBe(downAfter)
  })
})
