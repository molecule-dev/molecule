import { createElement } from 'react'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// `getClassMap()` → a Proxy: every access yields its key as a token — callable
// for method-style props (`cm.stack(2)`) and also usable bare (`cm.flex1`).
// `cn(...)` joins tokens, calling any function-valued args first.
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

// `Card` is the only `@molecule/app-ui-react` dependency — stub it to a
// <div data-card> that forwards className + children.
vi.mock('@molecule/app-ui-react', () => ({
  Card: ({ children, className }: { children?: ReactNode; className?: string }) =>
    createElement('div', { 'data-card': '', className }, children),
}))

const { KanbanBoard } = await import('../KanbanBoard.js')
const { KanbanCard } = await import('../KanbanCard.js')
const { KanbanColumn } = await import('../KanbanColumn.js')
const { KanbanColumnHeader } = await import('../KanbanColumnHeader.js')
import type { KanbanCardData, KanbanColumnData } from '../types.js'

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

const card = (id: string, over: Partial<KanbanCardData> = {}): KanbanCardData => ({
  id,
  title: `title-${id}`,
  ...over,
})
const column = (id: string, cards: KanbanCardData[] = []): KanbanColumnData => ({
  id,
  title: `col-${id}`,
  cards,
})

describe('KanbanColumnHeader', () => {
  it('renders the title', () => {
    const markup = html(createElement(KanbanColumnHeader, { title: 'To do' }))
    expect(markup).toContain('To do')
  })

  it('renders the count in parentheses when count is a number, including 0', () => {
    expect(html(createElement(KanbanColumnHeader, { title: 'T', count: 5 }))).toContain('(5)')
    expect(html(createElement(KanbanColumnHeader, { title: 'T', count: 0 }))).toContain('(0)')
  })

  it('omits the count when count is undefined', () => {
    const markup = html(createElement(KanbanColumnHeader, { title: 'T' }))
    expect(markup).not.toContain('(')
  })

  it('renders the actions slot', () => {
    const markup = html(
      createElement(KanbanColumnHeader, {
        title: 'T',
        actions: createElement('button', { 'data-act': '' }),
      }),
    )
    expect(markup).toContain('data-act=""')
  })

  it('forwards className', () => {
    const markup = html(createElement(KanbanColumnHeader, { title: 'T', className: 'hdr-cls' }))
    expect(markup).toContain('hdr-cls')
  })
})

describe('KanbanCard', () => {
  it('renders the card title', () => {
    const markup = html(createElement(KanbanCard, { card: card('a') }))
    expect(markup).toContain('title-a')
  })

  it('renders the body when present and omits it otherwise', () => {
    expect(html(createElement(KanbanCard, { card: card('a', { body: 'body-a' }) }))).toContain(
      'body-a',
    )
    expect(html(createElement(KanbanCard, { card: card('a') }))).not.toContain('body-')
  })

  it('renders the footer when present and omits it otherwise', () => {
    const withFooter = html(
      createElement(KanbanCard, {
        card: card('a', { footer: createElement('span', { 'data-footer': '' }) }),
      }),
    )
    expect(withFooter).toContain('data-footer=""')
    expect(html(createElement(KanbanCard, { card: card('a') }))).not.toContain('data-footer')
  })

  it('wraps the card in a draggable <div> when onDragStart is supplied', () => {
    const markup = html(createElement(KanbanCard, { card: card('a'), onDragStart: () => {} }))
    expect(markup).toContain('draggable')
  })

  it('renders no draggable wrapper when onDragStart is absent', () => {
    const markup = html(createElement(KanbanCard, { card: card('a') }))
    expect(markup).not.toContain('draggable')
  })

  it('forwards className onto the Card', () => {
    const markup = html(createElement(KanbanCard, { card: card('a'), className: 'card-cls' }))
    expect(markup).toContain('card-cls')
  })
})

describe('KanbanColumn', () => {
  it('renders the column title in its header', () => {
    const markup = html(createElement(KanbanColumn, { column: column('x') }))
    expect(markup).toContain('col-x')
  })

  it('renders the card count derived from cards.length', () => {
    const markup = html(
      createElement(KanbanColumn, { column: column('x', [card('a'), card('b')]) }),
    )
    expect(markup).toContain('(2)')
  })

  it('renders one card per card in the column', () => {
    const markup = html(
      createElement(KanbanColumn, { column: column('x', [card('a'), card('b')]) }),
    )
    expect(markup).toContain('title-a')
    expect(markup).toContain('title-b')
  })

  it('renders the headerActions slot', () => {
    const markup = html(
      createElement(KanbanColumn, {
        column: column('x'),
        headerActions: createElement('button', { 'data-act': '' }),
      }),
    )
    expect(markup).toContain('data-act=""')
  })

  it('renders the footer slot', () => {
    const markup = html(
      createElement(KanbanColumn, {
        column: column('x'),
        footer: createElement('div', { 'data-footer': '' }),
      }),
    )
    expect(markup).toContain('data-footer=""')
  })

  it('forwards className', () => {
    const markup = html(createElement(KanbanColumn, { column: column('x'), className: 'col-cls' }))
    expect(markup).toContain('col-cls')
  })
})

describe('KanbanBoard', () => {
  const columns = [column('todo', [card('a')]), column('done', [card('b'), card('c')])]

  it('renders one column per column with its title', () => {
    const markup = html(createElement(KanbanBoard, { columns }))
    expect(markup).toContain('col-todo')
    expect(markup).toContain('col-done')
  })

  it('renders the cards within their columns', () => {
    const markup = html(createElement(KanbanBoard, { columns }))
    expect(markup).toContain('title-a')
    expect(markup).toContain('title-b')
    expect(markup).toContain('title-c')
  })

  it('invokes renderHeaderActions once per column', () => {
    const seen: string[] = []
    const markup = html(
      createElement(KanbanBoard, {
        columns,
        renderHeaderActions: (col) => {
          seen.push(col.id)
          return createElement('button', { 'data-hdr': col.id })
        },
      }),
    )
    expect(seen).toEqual(['todo', 'done'])
    expect(markup).toContain('data-hdr="todo"')
    expect(markup).toContain('data-hdr="done"')
  })

  it('invokes renderFooter once per column', () => {
    const seen: string[] = []
    const markup = html(
      createElement(KanbanBoard, {
        columns,
        renderFooter: (col) => {
          seen.push(col.id)
          return createElement('div', { 'data-foot': col.id })
        },
      }),
    )
    expect(seen).toEqual(['todo', 'done'])
    expect(markup).toContain('data-foot="todo"')
    expect(markup).toContain('data-foot="done"')
  })

  it('forwards className onto the board wrapper', () => {
    const markup = html(createElement(KanbanBoard, { columns, className: 'board-cls' }))
    expect(markup).toContain('board-cls')
  })
})
