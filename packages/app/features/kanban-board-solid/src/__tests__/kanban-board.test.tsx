// @vitest-environment jsdom
/**
 * Unit tests for the Solid Kanban primitives — a port of
 * `@molecule/app-kanban-board-react/src/__tests__/kanban-board.test.tsx`: the
 * same test names and the same behavioral assertions, rendered with Solid in
 * jsdom and asserted on the markup the components produce.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
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

// `Card` is the only `@molecule/app-ui-solid` dependency — stub it to a
// <div data-card> that forwards className + children, like React's stub.
vi.mock('@molecule/app-ui-solid', () => ({
  Card: (props: { children?: JSX.Element; className?: string }) => (
    <div data-card="" class={props.className}>
      {props.children}
    </div>
  ),
}))

const { KanbanBoard } = await import('../KanbanBoard.jsx')
const { KanbanCard } = await import('../KanbanCard.jsx')
const { KanbanColumn } = await import('../KanbanColumn.jsx')
const { KanbanColumnHeader } = await import('../KanbanColumnHeader.jsx')
import type { KanbanCardData, KanbanColumnData } from '../types.js'

const disposers: Array<() => void> = []

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
})

/**
 * Renders a view with Solid's browser renderer and disposes it after the test.
 *
 * @param view - The view to render.
 * @returns The mount container.
 */
function mount(view: () => JSX.Element): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(view, container))
  return container
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
    const container = mount(() => <KanbanColumnHeader title="To do" />)
    expect(container.innerHTML).toContain('To do')
  })

  it('renders the count in parentheses when count is a number, including 0', () => {
    expect(mount(() => <KanbanColumnHeader title="T" count={5} />).innerHTML).toContain('(5)')
    expect(mount(() => <KanbanColumnHeader title="T" count={0} />).innerHTML).toContain('(0)')
  })

  it('omits the count when count is undefined', () => {
    const container = mount(() => <KanbanColumnHeader title="T" />)
    expect(container.innerHTML).not.toContain('(')
  })

  it('renders the actions slot', () => {
    const container = mount(() => <KanbanColumnHeader title="T" actions={<button data-act="" />} />)
    expect(container.innerHTML).toContain('data-act=""')
  })

  it('forwards className', () => {
    const container = mount(() => <KanbanColumnHeader title="T" className="hdr-cls" />)
    expect(container.innerHTML).toContain('hdr-cls')
  })
})

describe('KanbanCard', () => {
  it('renders the card title', () => {
    const container = mount(() => <KanbanCard card={card('a')} />)
    expect(container.innerHTML).toContain('title-a')
  })

  it('renders the body when present and omits it otherwise', () => {
    expect(mount(() => <KanbanCard card={card('a', { body: 'body-a' })} />).innerHTML).toContain(
      'body-a',
    )
    expect(mount(() => <KanbanCard card={card('a')} />).innerHTML).not.toContain('body-')
  })

  it('renders the footer when present and omits it otherwise', () => {
    const withFooter = mount(() => (
      <KanbanCard card={card('a', { footer: <span data-footer="" /> })} />
    ))
    expect(withFooter.innerHTML).toContain('data-footer=""')
    expect(mount(() => <KanbanCard card={card('a')} />).innerHTML).not.toContain('data-footer')
  })

  it('wraps the card in a draggable <div> when onDragStart is supplied', () => {
    const container = mount(() => <KanbanCard card={card('a')} onDragStart={() => {}} />)
    expect(container.innerHTML).toContain('draggable')
  })

  it('renders no draggable wrapper when onDragStart is absent', () => {
    const container = mount(() => <KanbanCard card={card('a')} />)
    expect(container.innerHTML).not.toContain('draggable')
  })

  it('forwards className onto the Card', () => {
    const container = mount(() => <KanbanCard card={card('a')} className="card-cls" />)
    expect(container.innerHTML).toContain('card-cls')
  })
})

describe('KanbanColumn', () => {
  it('renders the column title in its header', () => {
    const container = mount(() => <KanbanColumn column={column('x')} />)
    expect(container.innerHTML).toContain('col-x')
  })

  it('renders the card count derived from cards.length', () => {
    const container = mount(() => <KanbanColumn column={column('x', [card('a'), card('b')])} />)
    expect(container.innerHTML).toContain('(2)')
  })

  it('renders one card per card in the column', () => {
    const container = mount(() => <KanbanColumn column={column('x', [card('a'), card('b')])} />)
    expect(container.innerHTML).toContain('title-a')
    expect(container.innerHTML).toContain('title-b')
  })

  it('renders the headerActions slot', () => {
    const container = mount(() => (
      <KanbanColumn column={column('x')} headerActions={<button data-act="" />} />
    ))
    expect(container.innerHTML).toContain('data-act=""')
  })

  it('renders the footer slot', () => {
    const container = mount(() => (
      <KanbanColumn column={column('x')} footer={<div data-footer="" />} />
    ))
    expect(container.innerHTML).toContain('data-footer=""')
  })

  it('forwards className', () => {
    const container = mount(() => <KanbanColumn column={column('x')} className="col-cls" />)
    expect(container.innerHTML).toContain('col-cls')
  })
})

describe('KanbanBoard', () => {
  const columns = [column('todo', [card('a')]), column('done', [card('b'), card('c')])]

  it('renders one column per column with its title', () => {
    const container = mount(() => <KanbanBoard columns={columns} />)
    expect(container.innerHTML).toContain('col-todo')
    expect(container.innerHTML).toContain('col-done')
  })

  it('renders the cards within their columns', () => {
    const container = mount(() => <KanbanBoard columns={columns} />)
    expect(container.innerHTML).toContain('title-a')
    expect(container.innerHTML).toContain('title-b')
    expect(container.innerHTML).toContain('title-c')
  })

  it('invokes renderHeaderActions once per column', () => {
    const seen: string[] = []
    const container = mount(() => (
      <KanbanBoard
        columns={columns}
        renderHeaderActions={(col) => {
          seen.push(col.id)
          return <button data-hdr={col.id} />
        }}
      />
    ))
    expect(seen).toEqual(['todo', 'done'])
    expect(container.innerHTML).toContain('data-hdr="todo"')
    expect(container.innerHTML).toContain('data-hdr="done"')
  })

  it('invokes renderFooter once per column', () => {
    const seen: string[] = []
    const container = mount(() => (
      <KanbanBoard
        columns={columns}
        renderFooter={(col) => {
          seen.push(col.id)
          return <div data-foot={col.id} />
        }}
      />
    ))
    expect(seen).toEqual(['todo', 'done'])
    expect(container.innerHTML).toContain('data-foot="todo"')
    expect(container.innerHTML).toContain('data-foot="done"')
  })

  it('forwards className onto the board wrapper', () => {
    const container = mount(() => <KanbanBoard columns={columns} className="board-cls" />)
    expect(container.innerHTML).toContain('board-cls')
  })
})
