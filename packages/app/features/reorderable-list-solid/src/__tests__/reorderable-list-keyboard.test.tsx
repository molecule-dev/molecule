// @vitest-environment jsdom
/**
 * Keyboard-reordering behavior (the L115b fix), ported from
 * `@molecule/app-reorderable-list-react`'s own suite: the list must be
 * reorderable without a mouse. These mount with Solid into jsdom and drive the
 * real move controls + the Alt+Arrow key path, asserting `onReorder` fires
 * with the reordered array, that every move button announces its row's
 * position, and that focus follows the item after a move.
 *
 * @module
 */

import { createSignal, type JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `cursorPointer`), so tests can assert which cm.* class was applied without a
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

vi.mock('@molecule/app-solid', () => ({
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

const { ReorderableList } = await import('../ReorderableList.jsx')

interface Row {
  label: string
}
const makeItems = (): { id: string; data: Row }[] => [
  { id: 'a', data: { label: 'Alpha' } },
  { id: 'b', data: { label: 'Beta' } },
  { id: 'c', data: { label: 'Gamma' } },
]
const renderRow = (it: { id: string; data: Row }): JSX.Element => (
  <span data-item={it.id}>{it.data.label}</span>
)

const disposers: Array<() => void> = []

/** Mounts a list and returns its container. */
const mount = (onReorder: (next: { id: string; data: Row }[]) => void): HTMLElement => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(
    render(
      () => <ReorderableList items={makeItems()} onReorder={onReorder} renderItem={renderRow} />,
      container,
    ),
  )
  return container
}

/** Mounts a stateful list: `onReorder`'s result feeds back into `items`. */
const mountStateful = (): HTMLElement => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(
    render(() => {
      const [items, setItems] = createSignal(makeItems())
      return <ReorderableList items={items()} onReorder={setItems} renderItem={renderRow} />
    }, container),
  )
  return container
}

const order = (call: unknown): string[] => (call as { id: string }[]).map((i) => i.id)

/** Dispatches a real keydown on a button (bubbles, so Solid's delegation sees it). */
const keyDown = (button: HTMLButtonElement, key: string, altKey = false): void => {
  button.dispatchEvent(new KeyboardEvent('keydown', { key, altKey, bubbles: true }))
}

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

describe('ReorderableList keyboard reordering (L115b)', () => {
  it('moves an item DOWN when its move-down button is activated (no mouse)', () => {
    const onReorder = vi.fn()
    const host = mount(onReorder)
    const down = host.querySelector('[data-mol-id="reorderable-move-down-a"]') as HTMLButtonElement
    down.click()
    expect(onReorder).toHaveBeenCalledTimes(1)
    expect(order(onReorder.mock.calls[0]![0])).toEqual(['b', 'a', 'c'])
  })

  it('moves an item UP when its move-up button is activated', () => {
    const onReorder = vi.fn()
    const host = mount(onReorder)
    const up = host.querySelector('[data-mol-id="reorderable-move-up-c"]') as HTMLButtonElement
    up.click()
    expect(order(onReorder.mock.calls[0]![0])).toEqual(['a', 'c', 'b'])
  })

  it('reorders via Alt+ArrowDown / Alt+ArrowUp on a move button; plain arrows do NOT', () => {
    const onReorder = vi.fn()
    const host = mount(onReorder)
    const downA = host.querySelector('[data-mol-id="reorderable-move-down-a"]') as HTMLButtonElement
    keyDown(downA, 'ArrowDown', true)
    expect(order(onReorder.mock.calls[0]![0])).toEqual(['b', 'a', 'c'])

    const upC = host.querySelector('[data-mol-id="reorderable-move-up-c"]') as HTMLButtonElement
    keyDown(upC, 'ArrowUp', true)
    expect(order(onReorder.mock.calls[1]![0])).toEqual(['a', 'c', 'b'])

    // A plain arrow (no Alt) and an unrelated Alt+letter must not reorder —
    // the shortcut is Alt+Arrow on the button, nothing else.
    onReorder.mockClear()
    keyDown(downA, 'ArrowDown')
    keyDown(downA, 'a', true)
    expect(onReorder).not.toHaveBeenCalled()
  })

  it('describes each move button with its row position', () => {
    const host = mount(() => {})
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
    const host = mount(onReorder)
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
    const downAfter = host.querySelector(
      '[data-mol-id="reorderable-move-down-a"]',
    ) as HTMLButtonElement
    expect(downAfter.disabled).toBe(false)
    expect(document.activeElement).toBe(downAfter)
  })
})
