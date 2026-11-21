// @vitest-environment jsdom
/**
 * Unit tests for `ReorderableList`, ported from
 * `@molecule/app-reorderable-list-react`'s own suite: the same test names and
 * behavioral assertions, rendered with a real mount (jsdom), the bonded
 * ClassMap and the bonded i18n provider — the render functions arrive as
 * snippets, the way a Svelte app passes them.
 */
import '@molecule/app-framework-conformance/ui/setup'
import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it } from 'vitest'

import ReorderableList from '../ReorderableList.svelte'
import type { ReorderableListProps } from '../types.js'

/** One mounted list, unmounted in `afterEach`. */
const mounted: ReturnType<typeof mount>[] = []

/** A raw snippet rendering the given markup, the way a caller passes a node slot. */
const raw = (html: string): Snippet => createRawSnippet(() => ({ render: () => html }))

const items = [
  { id: 'a', data: { label: 'Alpha' } },
  { id: 'b', data: { label: 'Beta' } },
]

/** React's `renderItem`: a labelled span carrying the item id. */
const renderItem = createRawSnippet((item: () => { id: string; data: { label: string } }) => ({
  render: () => `<span data-item="${item().id}">${item().data.label}</span>`,
}))

/** React's `renderHandle`: a "≡" glyph. */
const renderHandle = raw('<span data-handle="">≡</span>')

/** The item shape these cases list. */
type Row = { label: string }

/**
 * Mounts a list with the given props and returns its host element.
 *
 * @param props - The list's props.
 * @returns The element the list was mounted into.
 */
function render(props: Partial<ReorderableListProps<Row>> = {}): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const targetProps: ReorderableListProps<Row> = {
    items,
    onReorder: () => {},
    renderItem,
    ...props,
  }
  mounted.push(
    mount<ReorderableListProps<Row>, Record<string, never>>(ReorderableList, {
      target: host,
      props: targetProps,
    }),
  )
  flushSync()
  return host
}

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
})

describe('ReorderableList', () => {
  it('renders a list with one row per item', () => {
    const markup = render().innerHTML
    expect(markup).toContain('data-item="a"')
    expect(markup).toContain('data-item="b"')
    expect(markup).toContain('Alpha')
    expect(markup).toContain('Beta')
  })

  it('renders a plain list: no role on the ul, no role or tabindex on the rows', () => {
    const markup = render().innerHTML
    // A `ul` already is a list (role="list" would be redundant) and a row is a
    // plain `li`: the drag handlers live on it, but it is not a focusable
    // widget — the move buttons are.
    expect(markup.match(/<ul[^>]*role=/g)).toBeNull()
    expect(markup.match(/<li[^>]*role=/g)).toBeNull()
    expect(markup.match(/<li[^>]*tabindex=/g)).toBeNull()
    expect(markup.match(/<li[^>]*aria-selected=/g)).toBeNull()
  })

  it('makes the whole row draggable when no renderHandle is supplied', () => {
    const markup = render().innerHTML
    expect(markup.match(/<li[^>]*draggable="true"/g) ?? []).toHaveLength(2)
  })

  it('renders a drag handle and non-draggable rows when renderHandle is supplied', () => {
    const markup = render({ renderHandle }).innerHTML
    expect(markup).toContain('data-handle=""')
    expect(markup).toContain('aria-label="Drag to reorder"')
    expect(markup).not.toMatch(/<li[^>]*draggable="true"/)
  })

  it('forwards className onto the <ul>', () => {
    const markup = render({ className: 'rl-cls' }).innerHTML
    expect(markup).toContain('rl-cls')
  })

  it('renders keyboard-accessible move controls with aria + data-mol-id, disabled at the edges', () => {
    const markup = render().innerHTML
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
    const markup = render().innerHTML
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
