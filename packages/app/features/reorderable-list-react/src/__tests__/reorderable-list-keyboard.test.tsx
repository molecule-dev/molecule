// @vitest-environment jsdom

/**
 * Keyboard-reordering behavior (the L115b fix): the list must be reorderable
 * without a mouse. These render into jsdom and drive the real move controls +
 * the Alt+Arrow key path, asserting `onReorder` fires with the reordered array.
 *
 * @module
 */

import { cleanup, fireEvent, render } from '@testing-library/react'
import { createElement } from 'react'
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

  it('reorders via Alt+ArrowDown / Alt+ArrowUp on the focused row; plain arrows do NOT', () => {
    const onReorder = vi.fn()
    const { container } = render(
      createElement(ReorderableList<Row>, {
        items: makeItems(),
        onReorder,
        renderItem: renderRow,
      }),
    )
    const rows = container.querySelectorAll('li')
    fireEvent.keyDown(rows[0], { key: 'ArrowDown', altKey: true })
    expect(order(onReorder.mock.calls[0][0])).toEqual(['b', 'a', 'c'])

    fireEvent.keyDown(rows[2], { key: 'ArrowUp', altKey: true })
    expect(order(onReorder.mock.calls[1][0])).toEqual(['a', 'c', 'b'])

    // A plain arrow (no Alt) must not reorder — it stays a normal key.
    onReorder.mockClear()
    fireEvent.keyDown(rows[0], { key: 'ArrowDown' })
    expect(onReorder).not.toHaveBeenCalled()
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
