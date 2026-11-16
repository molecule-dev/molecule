// @vitest-environment jsdom
/**
 * Unit tests for the Svelte Kanban primitives — a port of
 * `@molecule/app-kanban-board-react/src/__tests__/kanban-board.test.tsx`: the
 * same test names and the same behavioral assertions, rendered with a real
 * Svelte mount (jsdom) and asserted on the markup the components produce.
 *
 * @module
 */

import { createRawSnippet, flushSync, mount, type Snippet, unmount } from 'svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* call was applied without a real
// bond — the same mock the React tests use.
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

import KanbanBoard from '../KanbanBoard.svelte'
import KanbanCard from '../KanbanCard.svelte'
import KanbanColumn from '../KanbanColumn.svelte'
import KanbanColumnHeader from '../KanbanColumnHeader.svelte'
import type { KanbanCardData, KanbanColumnData } from '../types.js'

const instances: ReturnType<typeof mount>[] = []

afterEach(() => {
  for (const instance of instances.splice(0)) void unmount(instance)
  document.body.innerHTML = ''
})

/**
 * Mounts a Kanban component with the given props.
 *
 * @param component - The component to mount.
 * @param props - Its props.
 * @returns The rendered markup.
 */
const html = (
  component: Parameters<typeof mount>[0],
  props: Record<string, unknown> = {},
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  instances.push(mount(component, { target: host, props }))
  flushSync()
  return host.innerHTML
}

/**
 * A snippet rendering the given markup, the way a caller fills a slot.
 *
 * @param markup - The markup to render.
 * @returns The snippet.
 */
const raw = (markup: string): Snippet => createRawSnippet(() => ({ render: () => markup }))

/**
 * One card.
 *
 * @param id - Card id.
 * @param over - Extra fields.
 * @returns The card data.
 */
const card = (id: string, over: Partial<KanbanCardData> = {}): KanbanCardData => ({
  id,
  title: `title-${id}`,
  ...over,
})

/**
 * One column.
 *
 * @param id - Column id.
 * @param cards - The column's cards.
 * @returns The column data.
 */
const column = (id: string, cards: KanbanCardData[] = []): KanbanColumnData => ({
  id,
  title: `col-${id}`,
  cards,
})

describe('KanbanColumnHeader', () => {
  it('renders the title', () => {
    expect(html(KanbanColumnHeader, { title: 'To do' })).toContain('To do')
  })

  it('renders the count in parentheses when count is a number, including 0', () => {
    expect(html(KanbanColumnHeader, { title: 'T', count: 5 })).toContain('(5)')
    expect(html(KanbanColumnHeader, { title: 'T', count: 0 })).toContain('(0)')
  })

  it('omits the count when count is undefined', () => {
    expect(html(KanbanColumnHeader, { title: 'T' })).not.toContain('(')
  })

  it('renders the actions slot', () => {
    const markup = html(KanbanColumnHeader, {
      title: 'T',
      actions: raw('<button data-act></button>'),
    })
    expect(markup).toContain('data-act=""')
  })

  it('forwards className', () => {
    expect(html(KanbanColumnHeader, { title: 'T', className: 'hdr-cls' })).toContain('hdr-cls')
  })
})

describe('KanbanCard', () => {
  it('renders the card title', () => {
    expect(html(KanbanCard, { card: card('a') })).toContain('title-a')
  })

  it('renders the body when present and omits it otherwise', () => {
    expect(html(KanbanCard, { card: card('a', { body: 'body-a' }) })).toContain('body-a')
    expect(html(KanbanCard, { card: card('a') })).not.toContain('body-')
  })

  it('renders the footer when present and omits it otherwise', () => {
    const withFooter = html(KanbanCard, {
      card: card('a', { footer: raw('<span data-footer></span>') }),
    })
    expect(withFooter).toContain('data-footer=""')
    expect(html(KanbanCard, { card: card('a') })).not.toContain('data-footer')
  })

  it('wraps the card in a draggable <div> when onDragStart is supplied', () => {
    expect(html(KanbanCard, { card: card('a'), onDragStart: () => {} })).toContain('draggable')
  })

  it('renders no draggable wrapper when onDragStart is absent', () => {
    expect(html(KanbanCard, { card: card('a') })).not.toContain('draggable')
  })

  it('forwards className onto the Card', () => {
    expect(html(KanbanCard, { card: card('a'), className: 'card-cls' })).toContain('card-cls')
  })
})

describe('KanbanColumn', () => {
  it('renders the column title in its header', () => {
    expect(html(KanbanColumn, { column: column('x') })).toContain('col-x')
  })

  it('renders the card count derived from cards.length', () => {
    expect(html(KanbanColumn, { column: column('x', [card('a'), card('b')]) })).toContain('(2)')
  })

  it('renders one card per card in the column', () => {
    const markup = html(KanbanColumn, { column: column('x', [card('a'), card('b')]) })
    expect(markup).toContain('title-a')
    expect(markup).toContain('title-b')
  })

  it('renders the headerActions slot', () => {
    const markup = html(KanbanColumn, {
      column: column('x'),
      headerActions: raw('<button data-act></button>'),
    })
    expect(markup).toContain('data-act=""')
  })

  it('renders the footer slot', () => {
    const markup = html(KanbanColumn, {
      column: column('x'),
      footer: raw('<div data-footer></div>'),
    })
    expect(markup).toContain('data-footer=""')
  })

  it('forwards className', () => {
    expect(html(KanbanColumn, { column: column('x'), className: 'col-cls' })).toContain('col-cls')
  })
})

describe('KanbanBoard', () => {
  const columns = [column('todo', [card('a')]), column('done', [card('b'), card('c')])]

  it('renders one column per column with its title', () => {
    const markup = html(KanbanBoard, { columns })
    expect(markup).toContain('col-todo')
    expect(markup).toContain('col-done')
  })

  it('renders the cards within their columns', () => {
    const markup = html(KanbanBoard, { columns })
    expect(markup).toContain('title-a')
    expect(markup).toContain('title-b')
    expect(markup).toContain('title-c')
  })

  it('invokes renderHeaderActions once per column', () => {
    const seen: string[] = []
    const renderHeaderActions = createRawSnippet((getCol: () => KanbanColumnData) => ({
      render: () => {
        const col = getCol()
        seen.push(col.id)
        return `<button data-hdr="${col.id}"></button>`
      },
    }))
    const markup = html(KanbanBoard, { columns, renderHeaderActions } as Record<string, unknown>)
    expect(seen).toEqual(['todo', 'done'])
    expect(markup).toContain('data-hdr="todo"')
    expect(markup).toContain('data-hdr="done"')
  })

  it('invokes renderFooter once per column', () => {
    const seen: string[] = []
    const renderFooter = createRawSnippet((getCol: () => KanbanColumnData) => ({
      render: () => {
        const col = getCol()
        seen.push(col.id)
        return `<div data-foot="${col.id}"></div>`
      },
    }))
    const markup = html(KanbanBoard, { columns, renderFooter } as Record<string, unknown>)
    expect(seen).toEqual(['todo', 'done'])
    expect(markup).toContain('data-foot="todo"')
    expect(markup).toContain('data-foot="done"')
  })

  it('forwards className onto the board wrapper', () => {
    expect(html(KanbanBoard, { columns, className: 'board-cls' })).toContain('board-cls')
  })
})
