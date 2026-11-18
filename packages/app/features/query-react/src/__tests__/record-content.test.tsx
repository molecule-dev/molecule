import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { QueryContent } from '../index.js'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  host = document.createElement('div')
  root = createRoot(host)
})

afterEach(() => act(() => root.unmount()))

interface Notebook {
  id?: string
  pinned: boolean
}

it('withholds a record action until a nonempty ID exists, then passes that ID to the action', () => {
  const post = vi.fn()
  const pin = (id: string | undefined) => post(`/notebooks/${encodeURIComponent(id ?? '')}/pin`)
  const render = (data: Notebook | undefined) => {
    act(() =>
      root.render(
        <QueryContent
          query={{ data, status: data ? 'success' : 'loading', error: undefined }}
          getRecordId={(notebook) => notebook.id}
          pending={<p role="status">Loading notebook</p>}
        >
          {(_notebook, id) => <button onClick={() => pin(id)}>Pin notebook</button>}
        </QueryContent>,
      ),
    )
  }
  render(undefined)
  expect(host.querySelector('button')).toBeNull()
  for (const id of [undefined, '']) {
    render({ id, pinned: false })
    act(() => host.querySelector('button')?.click())
    expect(post).not.toHaveBeenCalled()
    expect(host.querySelector('[role="status"]')?.textContent).toBe('Loading notebook')
  }
  render({ id: 'team/sprint 1', pinned: false })
  act(() => host.querySelector('button')!.click())
  expect(post).toHaveBeenCalledExactlyOnceWith('/notebooks/team%2Fsprint%201/pin')
})

it('keeps the same record mounted on refresh and scopes mounted state by viewer and record', () => {
  function Pin({ id }: { id: number }) {
    const [pinned, setPinned] = useState(false)
    return (
      <button onClick={() => setPinned(true)}>
        {id}: {String(pinned)}
      </button>
    )
  }

  const render = (viewer: string, id: number, isPreviousData = false) => {
    act(() =>
      root.render(
        <QueryContent
          query={{ data: { id }, status: 'success', error: undefined, isPreviousData }}
          getRecordId={(notebook) => notebook.id}
          recordKey={viewer}
        >
          {(_notebook, id) => <Pin id={id} />}
        </QueryContent>,
      ),
    )
  }
  render('team-a', 0)
  const first = host.querySelector('button')!
  expect(first.textContent).toBe('0: false')
  act(() => first.click())
  render('team-a', 0)
  expect(host.querySelector('button')).toBe(first)
  expect(first.textContent).toBe('0: true')
  render('team-b', 0)
  expect(host.querySelector('button')?.textContent).toBe('0: false')
  act(() => host.querySelector('button')!.click())
  render('team-b', 1)
  expect(host.querySelector('button')?.textContent).toBe('1: false')
  render('team-b', 1, true)
  expect(host.querySelector('button')).toBeNull()
})

it('leaves read-only data without an identity renderable', () => {
  act(() =>
    root.render(
      <QueryContent query={{ data: 'Unsaved note', status: 'success', error: undefined }}>
        {(title) => <p>{title}</p>}
      </QueryContent>,
    ),
  )
  expect(host.textContent).toBe('Unsaved note')
})
