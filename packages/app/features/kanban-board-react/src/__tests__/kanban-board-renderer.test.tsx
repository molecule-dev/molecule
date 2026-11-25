// @vitest-environment jsdom
import { act } from 'react'
import { createPortal } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'

import { type DragDropRenderer, DragDropRendererProvider } from '@molecule/app-drag-drop/react'

import { KanbanBoard } from '../KanbanBoard.js'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => ({
    cn: (...parts: string[]) => parts.filter(Boolean).join(' '),
    flex: () => '',
    stack: () => '',
    sp: () => '',
    textSize: () => '',
    fontWeight: () => '',
    button: () => '',
  }),
}))

vi.mock('@molecule/app-ui-react', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const columns = [
  { id: 'todo', title: 'To do', cards: [{ id: 'a', title: 'Alpha' }] },
  { id: 'done', title: 'Done', cards: [] },
]

const alternateRenderer: DragDropRenderer = {
  Scope: ({ children }) => <>{children}</>,
  Source: ({ children, source }) => <div data-adapter-source={source.id}>{children}</div>,
  Target: ({ children }) => <>{children}</>,
}

function dispatchDragEvent(target: Element, type: string, dataTransfer: object) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'dataTransfer', { value: dataTransfer })
  act(() => {
    target.dispatchEvent(event)
  })
  return event
}

function drop(target: Element, payload: object) {
  const getData = vi.fn((type: string) =>
    type === 'text/molecule-kanban' ? JSON.stringify(payload) : '',
  )
  return dispatchDragEvent(target, 'drop', { getData })
}

it('uses the scoped React renderer and safely restores the HTML5 adapter when the scope changes', () => {
  const move = vi.fn()
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const render = (renderer: DragDropRenderer | null) =>
    act(() =>
      root.render(
        <DragDropRendererProvider value={renderer}>
          <KanbanBoard columns={columns} onCardMove={move} />
        </DragDropRendererProvider>,
      ),
    )
  const target = () => {
    const section = host.querySelectorAll('section')[1]
    if (!section) throw new Error('Missing target column')
    return section
  }
  try {
    // A direct browser drop with valid JSON still has to identify a card in its source column.
    render(null)
    expect(drop(target(), { cardId: 'unknown', fromColumnId: 'todo' }).defaultPrevented).toBe(true)
    expect(move).not.toHaveBeenCalled()
    expect(host.querySelector('div[draggable="true"]')).toBeInstanceOf(HTMLElement)

    render(alternateRenderer)
    expect(host.querySelector('[data-adapter-source="a"]')).toBeInstanceOf(HTMLElement)
    expect(host.querySelector('[draggable]')).toBeNull()
    expect(drop(target(), { cardId: 'a', fromColumnId: 'todo' }).defaultPrevented).toBe(false)
    expect(move).not.toHaveBeenCalled()

    render(null)
    expect(host.querySelector('[data-adapter-source]')).toBeNull()
    expect(drop(target(), { cardId: 'a', fromColumnId: 'todo' }).defaultPrevented).toBe(true)
    expect(move).toHaveBeenCalledExactlyOnceWith('a', 'todo', 'done')
  } finally {
    act(() => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
  }
})

it('consumes a kanban drop inside a React portal before React bubbles it to the parent board', () => {
  const outerMove = vi.fn()
  const innerMove = vi.fn()
  const host = document.createElement('div')
  const portalHost = document.createElement('div')
  document.body.append(host, portalHost)
  const root = createRoot(host)
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  try {
    act(() =>
      root.render(
        <KanbanBoard
          columns={columns}
          onCardMove={outerMove}
          renderFooter={(column) =>
            column.id === 'done'
              ? createPortal(<KanbanBoard columns={columns} onCardMove={innerMove} />, portalHost)
              : undefined
          }
        />,
      ),
    )
    const target = portalHost.querySelectorAll('section')[1]
    if (!target) throw new Error('Missing target column inside the portal')
    drop(target, { cardId: 'a', fromColumnId: 'todo' })
    expect(innerMove).toHaveBeenCalledExactlyOnceWith('a', 'todo', 'done')
    expect(outerMove).not.toHaveBeenCalled()
  } finally {
    act(() => root.unmount())
    host.remove()
    portalHost.remove()
    vi.unstubAllGlobals()
  }
})

it('keeps the innermost kanban card as the drag source', () => {
  const outerMove = vi.fn()
  const innerMove = vi.fn()
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  try {
    const outer = [
      {
        id: 'outer-todo',
        title: 'Outer to do',
        cards: [
          {
            id: 'outer',
            title: 'Outer card',
            body: <KanbanBoard columns={columns} onCardMove={innerMove} />,
          },
        ],
      },
    ]
    act(() => root.render(<KanbanBoard columns={outer} onCardMove={outerMove} />))
    const source = host.querySelectorAll('[draggable="true"]')[1]
    const target = host.querySelectorAll('section')[2]
    if (!source || !target) throw new Error('Missing inner board')
    const transfer = new Map<string, string>()
    const dataTransfer = {
      setData: (type: string, value: string) => transfer.set(type, value),
      getData: (type: string) => transfer.get(type) ?? '',
    }

    dispatchDragEvent(source, 'dragstart', dataTransfer)
    expect(dataTransfer.getData('text/molecule-kanban')).toBe(
      JSON.stringify({ cardId: 'a', fromColumnId: 'todo' }),
    )
    dispatchDragEvent(target, 'drop', dataTransfer)

    expect(innerMove).toHaveBeenCalledExactlyOnceWith('a', 'todo', 'done')
    expect(outerMove).not.toHaveBeenCalled()
  } finally {
    act(() => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
  }
})
