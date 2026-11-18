// @vitest-environment jsdom
/**
 * Port of `query-react/src/__tests__/record-content.test.tsx`: a record action
 * waits for a nonempty identity, the mounted record is scoped to its ID and
 * viewer, and read-only data needs no identity.
 */
import { createSignal, type JSX } from 'solid-js'
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'

import { resetQueryClient, setProvider } from '@molecule/app-query'
import { provider } from '@molecule/app-query-memory'

import { QueryContent } from '../query-content.jsx'
import { mountComponent, settle, unmountAll } from './helpers.jsx'

beforeAll(() => setProvider(provider))
beforeEach(() => resetQueryClient())
afterAll(unmountAll)
afterEach(async () => {
  await settle()
})

interface Notebook {
  id?: string
  pinned: boolean
}

it('withholds a record action until a nonempty ID exists, then passes that ID to the action', async () => {
  const post = vi.fn()
  const pin = (id: string | undefined): void => {
    post(`/notebooks/${encodeURIComponent(id ?? '')}/pin`)
  }
  const [notebook, setNotebook] = createSignal<Notebook | undefined>(undefined)
  const mounted = mountComponent(() => (
    <QueryContent<Notebook, string>
      query={{
        data: notebook(),
        status: notebook() ? 'success' : 'loading',
        error: undefined,
      }}
      getRecordId={(data) => data.id}
      pending={<p role="status">Loading notebook</p>}
    >
      {(_data, id) => <button onClick={() => pin(id)}>Pin notebook</button>}
    </QueryContent>
  ))
  expect(mounted.host.querySelector('button')).toBeNull()
  for (const id of [undefined, '']) {
    setNotebook({ id, pinned: false })
    await settle()
    mounted.host.querySelector<HTMLButtonElement>('button')?.click()
    expect(post).not.toHaveBeenCalled()
    expect(mounted.host.querySelector('[role="status"]')?.textContent).toBe('Loading notebook')
  }
  setNotebook({ id: 'team/sprint 1', pinned: false })
  await settle()
  mounted.host.querySelector<HTMLButtonElement>('button')!.click()
  expect(post).toHaveBeenCalledExactlyOnceWith('/notebooks/team%2Fsprint%201/pin')
  await mounted.unmount()
})

it('keeps the same record mounted on refresh and scopes mounted state by viewer and record', async () => {
  function Pin(props: { id: number }): JSX.Element {
    const [pinned, setPinned] = createSignal(false)
    return <button onClick={() => setPinned(true)}>{`${props.id}: ${String(pinned())}`}</button>
  }
  const [viewer, setViewer] = createSignal('team-a')
  const [id, setId] = createSignal(0)
  const [isPreviousData, setIsPreviousData] = createSignal(false)
  const mounted = mountComponent(() => (
    <QueryContent<{ id: number }, number>
      query={{
        data: { id: id() },
        status: 'success',
        error: undefined,
        isPreviousData: isPreviousData(),
      }}
      getRecordId={(notebook) => notebook.id}
      recordKey={viewer()}
    >
      {(_data, recordId) => <Pin id={recordId} />}
    </QueryContent>
  ))
  const first = mounted.host.querySelector('button')!
  expect(first.textContent).toBe('0: false')
  first.click()
  await settle()
  expect(first.textContent).toBe('0: true')
  setViewer('team-a')
  await settle()
  expect(mounted.host.querySelector('button')).toBe(first)
  expect(first.textContent).toBe('0: true')
  setViewer('team-b')
  await settle()
  expect(mounted.host.querySelector('button')?.textContent).toBe('0: false')
  mounted.host.querySelector<HTMLButtonElement>('button')!.click()
  await settle()
  setId(1)
  await settle()
  expect(mounted.host.querySelector('button')?.textContent).toBe('1: false')
  setIsPreviousData(true)
  await settle()
  expect(mounted.host.querySelector('button')).toBeNull()
  await mounted.unmount()
})

it('leaves read-only data without an identity renderable', async () => {
  const mounted = mountComponent(() => (
    <QueryContent<string> query={{ data: 'Unsaved note', status: 'success', error: undefined }}>
      {(title) => <p>{title()}</p>}
    </QueryContent>
  ))
  expect(mounted.host.textContent).toBe('Unsaved note')
  await mounted.unmount()
})
