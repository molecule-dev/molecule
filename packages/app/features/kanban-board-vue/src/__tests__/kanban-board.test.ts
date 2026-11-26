// @vitest-environment jsdom
/**
 * Unit tests for the Vue Kanban primitives — a port of
 * `@molecule/app-kanban-board-react/src/__tests__/kanban-board.test.tsx`: the
 * same test names and the same behavioral assertions, rendered with Vue in
 * jsdom and asserted on the markup the components produce.
 *
 * @module
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token (e.g.
// `stack`), so tests can assert which cm.* call was applied without a real
// bond — the same mock the React tests use. `cn(...)` joins tokens, calling any
// function-valued args first (so a bare `cm.flex1` behaves like React's).
vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
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

// `Card` is the only `@molecule/app-ui-vue` dependency — stub it to a
// <div data-card> that forwards className + children, like React's stub.
vi.mock('@molecule/app-ui-vue', async (importOriginal) => {
  const { defineComponent, h } = await import('vue')
  return {
    ...(await importOriginal<Record<string, unknown>>()),
    Card: defineComponent({
      name: 'MockCard',
      props: { className: String },
      setup(props, { slots }) {
        return () => h('div', { 'data-card': '', class: props.className }, slots.default?.())
      },
    }),
  }
})

import { createApp, defineComponent, h, type VNodeChild } from 'vue'

const { KanbanBoard } = await import('../KanbanBoard.js')
const { KanbanCard } = await import('../KanbanCard.js')
const { KanbanColumn } = await import('../KanbanColumn.js')
const { KanbanColumnHeader } = await import('../KanbanColumnHeader.js')
import type { KanbanCardData, KanbanColumnData } from '../types.js'

afterEach(() => {
  document.body.innerHTML = ''
})

/**
 * Renders a Kanban component with the given props and slots.
 *
 * @param component - The component to mount.
 * @param props - Its props.
 * @param slots - Its named slots.
 * @returns The rendered markup.
 */
const html = (
  component: Parameters<typeof h>[0],
  props: Record<string, unknown> = {},
  slots?: Record<string, () => VNodeChild[]>,
): string => {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(defineComponent({ render: () => h(component, props, slots) }))
  app.mount(host)
  const markup = host.innerHTML
  app.unmount()
  host.remove()
  return markup
}

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
    const markup = html(KanbanColumnHeader, { title: 'To do' })
    expect(markup).toContain('To do')
  })

  it('renders the count in parentheses when count is a number, including 0', () => {
    expect(html(KanbanColumnHeader, { title: 'T', count: 5 })).toContain('(5)')
    expect(html(KanbanColumnHeader, { title: 'T', count: 0 })).toContain('(0)')
  })

  it('omits the count when count is undefined', () => {
    const markup = html(KanbanColumnHeader, { title: 'T' })
    expect(markup).not.toContain('(')
  })

  it('renders the actions slot', () => {
    const markup = html(
      KanbanColumnHeader,
      { title: 'T' },
      { actions: () => [h('button', { 'data-act': '' })] },
    )
    expect(markup).toContain('data-act=""')
  })

  it('forwards className', () => {
    const markup = html(KanbanColumnHeader, { title: 'T', className: 'hdr-cls' })
    expect(markup).toContain('hdr-cls')
  })
})

describe('KanbanCard', () => {
  it('renders the card title', () => {
    const markup = html(KanbanCard, { card: card('a') })
    expect(markup).toContain('title-a')
  })

  it('renders the body when present and omits it otherwise', () => {
    expect(html(KanbanCard, { card: card('a', { body: 'body-a' }) })).toContain('body-a')
    expect(html(KanbanCard, { card: card('a') })).not.toContain('body-')
  })

  it('renders the footer when present and omits it otherwise', () => {
    const withFooter = html(KanbanCard, {
      card: card('a', { footer: h('span', { 'data-footer': '' }) }),
    })
    expect(withFooter).toContain('data-footer=""')
    expect(html(KanbanCard, { card: card('a') })).not.toContain('data-footer')
  })

  it('wraps the card in a draggable <div> when onDragStart is supplied', () => {
    const markup = html(KanbanCard, { card: card('a'), onDragStart: () => {} })
    expect(markup).toContain('draggable')
  })

  it('renders no draggable wrapper when onDragStart is absent', () => {
    const markup = html(KanbanCard, { card: card('a') })
    expect(markup).not.toContain('draggable')
  })

  it('forwards className onto the Card', () => {
    const markup = html(KanbanCard, { card: card('a'), className: 'card-cls' })
    expect(markup).toContain('card-cls')
  })
})

describe('KanbanColumn', () => {
  it('renders the column title in its header', () => {
    const markup = html(KanbanColumn, { column: column('x') })
    expect(markup).toContain('col-x')
  })

  it('renders the card count derived from cards.length', () => {
    const markup = html(KanbanColumn, { column: column('x', [card('a'), card('b')]) })
    expect(markup).toContain('(2)')
  })

  it('renders one card per card in the column', () => {
    const markup = html(KanbanColumn, { column: column('x', [card('a'), card('b')]) })
    expect(markup).toContain('title-a')
    expect(markup).toContain('title-b')
  })

  it('renders the headerActions slot', () => {
    const markup = html(
      KanbanColumn,
      { column: column('x') },
      { headerActions: () => [h('button', { 'data-act': '' })] },
    )
    expect(markup).toContain('data-act=""')
  })

  it('renders the footer slot', () => {
    const markup = html(
      KanbanColumn,
      { column: column('x') },
      { footer: () => [h('div', { 'data-footer': '' })] },
    )
    expect(markup).toContain('data-footer=""')
  })

  it('forwards className', () => {
    const markup = html(KanbanColumn, { column: column('x'), className: 'col-cls' })
    expect(markup).toContain('col-cls')
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
    const markup = html(KanbanBoard, {
      columns,
      renderHeaderActions: (col: KanbanColumnData) => {
        seen.push(col.id)
        return h('button', { 'data-hdr': col.id })
      },
    })
    expect(seen).toEqual(['todo', 'done'])
    expect(markup).toContain('data-hdr="todo"')
    expect(markup).toContain('data-hdr="done"')
  })

  it('invokes renderFooter once per column', () => {
    const seen: string[] = []
    const markup = html(KanbanBoard, {
      columns,
      renderFooter: (col: KanbanColumnData) => {
        seen.push(col.id)
        return h('div', { 'data-foot': col.id })
      },
    })
    expect(seen).toEqual(['todo', 'done'])
    expect(markup).toContain('data-foot="todo"')
    expect(markup).toContain('data-foot="done"')
  })

  it('forwards className onto the board wrapper', () => {
    const markup = html(KanbanBoard, { columns, className: 'board-cls' })
    expect(markup).toContain('board-cls')
  })
})
