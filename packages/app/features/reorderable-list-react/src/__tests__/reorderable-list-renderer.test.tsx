// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { afterEach, expect, it, vi } from 'vitest'

import { ReorderableList } from '../ReorderableList.js'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => ({
    cn: (...parts: string[]) => parts.filter(Boolean).join(' '),
    flex: () => '',
    stack: () => '',
    sp: () => '',
  }),
}))

const items = [
  { id: 'a', data: 'Alpha' },
  { id: 'b', data: 'Beta' },
]

afterEach(cleanup)

it('keeps drag start in the innermost list so the outer row cannot replace its transfer', () => {
  const outerReorder = vi.fn()
  const innerReorder = vi.fn()
  const { getByText } = render(
    <ReorderableList
      items={[{ id: 'outer', data: 'Outer row' }]}
      onReorder={outerReorder}
      renderItem={(item, dragging) => (
        <>
          {dragging ? 'Outer is dragging' : item.data}
          <ReorderableList items={items} onReorder={innerReorder} renderItem={(row) => row.data} />
        </>
      )}
    />,
  )
  const source = getByText('Alpha').closest('li')
  const target = getByText('Beta').closest('li')
  const outerRow = source?.parentElement?.closest('li')
  if (!source || !target || !outerRow) throw new Error('Missing nested list rows')
  const transfer = new Map<string, string>()
  const dataTransfer = {
    types: ['text/plain'],
    setData: (type: string, value: string) => transfer.set(type, value),
    getData: (type: string) => transfer.get(type) ?? '',
  }

  fireEvent.dragStart(source, { dataTransfer })
  expect(dataTransfer.getData('text/plain')).toBe('a')
  expect(getByText('Outer row')).toBeTruthy()
  fireEvent.dragOver(target, { dataTransfer })
  expect(target.style.borderTopWidth).toBe('2px')
  expect(outerRow.style.borderTopWidth).toBe('')
  fireEvent.drop(target, { dataTransfer })

  expect(innerReorder).toHaveBeenCalledExactlyOnceWith([items[1], items[0]])
  expect(outerReorder).not.toHaveBeenCalled()
})

it('consumes a row drop inside a React portal before React bubbles it to the parent list', () => {
  const outerReorder = vi.fn()
  const innerReorder = vi.fn()
  const portalHost = document.createElement('div')
  document.body.append(portalHost)
  try {
    render(
      <ReorderableList
        items={items}
        onReorder={outerReorder}
        renderItem={(item) =>
          item.id === 'b'
            ? createPortal(
                <ReorderableList
                  items={items}
                  onReorder={innerReorder}
                  renderItem={(row) => row.data}
                />,
                portalHost,
              )
            : item.data
        }
      />,
    )
    const target = portalHost.querySelectorAll('li')[1]
    if (!target) throw new Error('Missing target row inside the portal')
    const dataTransfer = { getData: (type: string) => (type === 'text/plain' ? 'a' : '') }
    fireEvent.drop(target, { dataTransfer })
    expect(innerReorder).toHaveBeenCalledExactlyOnceWith([items[1], items[0]])
    expect(outerReorder).not.toHaveBeenCalled()
  } finally {
    cleanup()
    portalHost.remove()
  }
})

/** Controlled list hosted by a React portal in another DOM realm. */
function IframeList({ host }: { host: HTMLElement }) {
  const [rows, setRows] = useState(items)
  return createPortal(
    <ReorderableList items={rows} onReorder={setRows} renderItem={(item) => item.data} />,
    host,
  )
}

it('moves focus to the opposite button in a React portal rendered in an iframe', () => {
  const frame = document.createElement('iframe')
  document.body.append(frame)
  try {
    const doc = frame.contentDocument
    if (!doc) throw new Error('Missing iframe document')
    render(<IframeList host={doc.body} />)
    const down = doc.querySelector<HTMLButtonElement>('[data-mol-id="reorderable-move-down-a"]')
    const up = doc.querySelector<HTMLButtonElement>('[data-mol-id="reorderable-move-up-a"]')
    if (!up || !down) throw new Error('Missing move buttons in the iframe')
    down.focus()
    fireEvent.click(down)
    expect(down.disabled).toBe(true)
    expect(doc.activeElement).toBe(up)
  } finally {
    cleanup()
    frame.remove()
  }
})
