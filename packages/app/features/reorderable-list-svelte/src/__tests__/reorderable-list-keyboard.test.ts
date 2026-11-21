// @vitest-environment jsdom
/**
 * Keyboard-reordering behavior (the L115b fix), ported from
 * `@molecule/app-reorderable-list-react`'s own suite: the list must be
 * reorderable without a mouse. These mount with Svelte into jsdom and drive
 * the real move controls + the Alt+Arrow key path, asserting `onReorder`
 * fires with the reordered array, that every move button announces its row's
 * position, and that focus follows the item after a move.
 */
import '@molecule/app-framework-conformance/ui/setup'
import { createRawSnippet, flushSync, mount, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ReorderableList from '../ReorderableList.svelte'
import type { ReorderableItem, ReorderableListProps } from '../types.js'
import StatefulList from './StatefulList.svelte'

interface Row {
  label: string
}

const makeItems = (): { id: string; data: Row }[] => [
  { id: 'a', data: { label: 'Alpha' } },
  { id: 'b', data: { label: 'Beta' } },
  { id: 'c', data: { label: 'Gamma' } },
]

/** React's `renderItem`: a labelled span carrying the item id. */
const renderItem = createRawSnippet((item: () => { id: string; data: Row }) => ({
  render: () => `<span data-item="${item().id}">${item().data.label}</span>`,
}))

const mounted: ReturnType<typeof mount>[] = []

/**
 * A fresh host element in the document body.
 *
 * @returns The new host element.
 */
const hostFor = (): HTMLElement => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  return host
}

/**
 * Mounts a list whose `onReorder` the test watches.
 *
 * @param onReorder - The callback the list reports new orders to.
 * @returns The element the list was mounted into.
 */
const mountListWith = (onReorder: (next: ReorderableItem<Row>[]) => void): HTMLElement => {
  const host = hostFor()
  mounted.push(
    mount<ReorderableListProps<Row>, Record<string, never>>(ReorderableList, {
      target: host,
      props: { items: makeItems(), onReorder, renderItem },
    }),
  )
  flushSync()
  return host
}

/**
 * Mounts the stateful list: `onReorder`'s result feeds back into `items`.
 *
 * @returns The element the list was mounted into.
 */
const mountStateful = (): HTMLElement => {
  const host = hostFor()
  mounted.push(mount(StatefulList, { target: host, props: { items: makeItems(), renderItem } }))
  flushSync()
  return host
}

/**
 * The item ids of an order the list reported.
 *
 * @param call - The order the list reported.
 * @returns The ids, in order.
 */
const order = (call: ReorderableItem<Row>[]): string[] => call.map((i) => i.id)

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

describe('ReorderableList keyboard reordering (L115b)', () => {
  it('moves an item DOWN when its move-down button is activated (no mouse)', () => {
    const onReorder = vi.fn()
    const host = mountListWith(onReorder)
    const down = host.querySelector('[data-mol-id="reorderable-move-down-a"]') as HTMLButtonElement
    down.click()
    expect(onReorder).toHaveBeenCalledTimes(1)
    expect(order(onReorder.mock.calls[0]![0])).toEqual(['b', 'a', 'c'])
  })

  it('moves an item UP when its move-up button is activated', () => {
    const onReorder = vi.fn()
    const host = mountListWith(onReorder)
    const up = host.querySelector('[data-mol-id="reorderable-move-up-c"]') as HTMLButtonElement
    up.click()
    expect(order(onReorder.mock.calls[0]![0])).toEqual(['a', 'c', 'b'])
  })

  it('reorders via Alt+ArrowDown / Alt+ArrowUp on a move button; plain arrows do NOT', () => {
    const onReorder = vi.fn()
    const host = mountListWith(onReorder)
    const downA = host.querySelector('[data-mol-id="reorderable-move-down-a"]') as HTMLButtonElement
    downA.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true, bubbles: true }),
    )
    expect(order(onReorder.mock.calls[0]![0])).toEqual(['b', 'a', 'c'])

    const upC = host.querySelector('[data-mol-id="reorderable-move-up-c"]') as HTMLButtonElement
    upC.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true, bubbles: true }))
    expect(order(onReorder.mock.calls[1]![0])).toEqual(['a', 'c', 'b'])

    // A plain arrow (no Alt) and an unrelated Alt+letter must not reorder —
    // the shortcut is Alt+Arrow on the button, nothing else.
    onReorder.mockClear()
    downA.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    downA.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', altKey: true, bubbles: true }))
    expect(onReorder).not.toHaveBeenCalled()
  })

  it('describes each move button with its row position', () => {
    const host = mountListWith(() => {})
    // The accessible description of a row's move buttons is that row's
    // position ("Item 2 of 3"), taken from the row's sr-only position span.
    const down = host.querySelector('[data-mol-id="reorderable-move-down-b"]')
    const up = host.querySelector('[data-mol-id="reorderable-move-up-b"]')
    const upC = host.querySelector('[data-mol-id="reorderable-move-up-c"]')
    const described = down?.getAttribute('aria-describedby') ?? ''
    expect(described).toBeTruthy()
    expect(document.getElementById(described)?.textContent).toBe('Item 2 of 3')
    expect(up?.getAttribute('aria-describedby')).toBe(described)
    expect(document.getElementById(upC?.getAttribute('aria-describedby') ?? '')?.textContent).toBe(
      'Item 3 of 3',
    )
  })

  it('disables and does not fire from the boundary buttons', () => {
    const onReorder = vi.fn()
    const host = mountListWith(onReorder)
    const firstUp = host.querySelector('[data-mol-id="reorderable-move-up-a"]') as HTMLButtonElement
    const lastDown = host.querySelector(
      '[data-mol-id="reorderable-move-down-c"]',
    ) as HTMLButtonElement
    expect(firstUp.disabled).toBe(true)
    expect(lastDown.disabled).toBe(true)
    firstUp.click()
    lastDown.click()
    expect(onReorder).not.toHaveBeenCalled()
  })
})

describe('ReorderableList focus follows the item', () => {
  it('a move that disables the used button leaves focus on that item’s other button', () => {
    const host = mountStateful()
    // Row 2 of 3's "Move down" moves `b` to the end: its move-down disables,
    // and focus settles on the same item's move-up.
    const down = host.querySelector('[data-mol-id="reorderable-move-down-b"]') as HTMLButtonElement
    down.focus()
    expect(document.activeElement).toBe(down)
    down.click()
    flushSync()
    const up = host.querySelector('[data-mol-id="reorderable-move-up-b"]') as HTMLButtonElement
    expect(up.disabled).toBe(false)
    expect(document.activeElement).toBe(up)
  })

  it('a move that keeps the used button enabled keeps focus on it', () => {
    const host = mountStateful()
    // Row 1 of 3's "Move down" moves `a` into the middle: the same button stays
    // enabled (the row is keyed by item id, so it moves with its row).
    const down = host.querySelector('[data-mol-id="reorderable-move-down-a"]') as HTMLButtonElement
    down.focus()
    expect(document.activeElement).toBe(down)
    down.click()
    flushSync()
    const downAfter = host.querySelector(
      '[data-mol-id="reorderable-move-down-a"]',
    ) as HTMLButtonElement
    expect(downAfter.disabled).toBe(false)
    expect(document.activeElement).toBe(downAfter)
  })
})
