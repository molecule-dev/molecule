// @vitest-environment jsdom
/**
 * Port of `query-react/src/__tests__/record-content.test.tsx`: a record action
 * waits for a nonempty identity, the mounted record is scoped to its ID and
 * viewer, and read-only data needs no identity.
 */
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { defineComponent, h, ref, shallowRef } from 'vue'

import { resetQueryClient, setProvider } from '@molecule/app-query'
import { provider } from '@molecule/app-query-memory'

import { QueryContent } from '../query-content.js'
import { mountApp, settle, unmountAll } from './helpers.js'

beforeAll(() => setProvider(provider))
beforeEach(() => resetQueryClient())
afterEach(async () => {
  await unmountAll()
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
  const state = shallowRef<{
    data: Notebook | undefined
    status: 'loading' | 'success'
    error: undefined
  }>({ data: undefined, status: 'loading', error: undefined })
  const page = mountApp(
    () => () =>
      h(QueryContent<Notebook, string>, {
        query: state.value,
        getRecordId: (notebook: Notebook) => notebook.id,
        pending: h('p', { role: 'status' }, 'Loading notebook'),
        children: (_notebook: Notebook, id: string) =>
          h('button', { onClick: () => pin(id) }, 'Pin notebook'),
      }),
  )
  expect(page.host.querySelector('button')).toBeNull()
  for (const id of [undefined, '']) {
    state.value = { data: { id, pinned: false }, status: 'success', error: undefined }
    await settle()
    page.host.querySelector<HTMLButtonElement>('button')?.click()
    expect(post).not.toHaveBeenCalled()
    expect(page.host.querySelector('[role="status"]')?.textContent).toBe('Loading notebook')
  }
  state.value = {
    data: { id: 'team/sprint 1', pinned: false },
    status: 'success',
    error: undefined,
  }
  await settle()
  page.host.querySelector<HTMLButtonElement>('button')!.click()
  expect(post).toHaveBeenCalledExactlyOnceWith('/notebooks/team%2Fsprint%201/pin')
})

it('keeps the same record mounted on refresh and scopes mounted state by viewer and record', async () => {
  const Pin = defineComponent({
    props: { id: { type: Number, required: true } },
    setup(props) {
      const pinned = ref(false)
      return () =>
        h(
          'button',
          { onClick: () => (pinned.value = true) },
          `${props.id}: ${String(pinned.value)}`,
        )
    },
  })
  const viewer = shallowRef('team-a')
  const notebookId = shallowRef(0)
  const isPreviousData = shallowRef(false)
  const page = mountApp(
    () => () =>
      h(QueryContent<{ id: number }, number>, {
        query: {
          data: { id: notebookId.value },
          status: 'success',
          error: undefined,
          isPreviousData: isPreviousData.value,
        },
        getRecordId: (notebook: { id: number }) => notebook.id,
        recordKey: viewer.value,
        children: (_notebook: { id: number }, id: number) => h(Pin, { id }),
      }),
  )
  const first = page.host.querySelector('button')!
  expect(first.textContent).toBe('0: false')
  first.click()
  await settle()
  expect(first.textContent).toBe('0: true')
  notebookId.value = 0
  await settle()
  expect(page.host.querySelector('button')).toBe(first)
  expect(first.textContent).toBe('0: true')
  viewer.value = 'team-b'
  await settle()
  expect(page.host.querySelector('button')?.textContent).toBe('0: false')
  page.host.querySelector<HTMLButtonElement>('button')!.click()
  await settle()
  notebookId.value = 1
  await settle()
  expect(page.host.querySelector('button')?.textContent).toBe('1: false')
  isPreviousData.value = true
  await settle()
  expect(page.host.querySelector('button')).toBeNull()
})

it('leaves read-only data without an identity renderable', async () => {
  const page = mountApp(
    () => () =>
      h(QueryContent<string>, {
        query: { data: 'Unsaved note', status: 'success', error: undefined },
        children: (title: string) => h('p', {}, title),
      }),
  )
  expect(page.host.textContent).toBe('Unsaved note')
})
