// @vitest-environment jsdom
/**
 * Port of `query-react/src/__tests__/query-content.test.tsx`: `QueryContent`
 * keeps loading status outside a list, mounts actions only with a real
 * document, keeps cached data actionable through a failed refresh, and treats
 * false, zero, an empty string and an empty list as documents.
 */
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref, shallowRef } from 'vue'

import { getQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider } from '@molecule/app-query-memory'

import { QueryContent } from '../query-content.js'
import { useQuery } from '../useQuery.js'
import { deferred, mountApp, mountComponent, settle, unmountAll } from './helpers.js'

beforeAll(() => setProvider(provider))
beforeEach(() => resetQueryClient())
afterEach(async () => {
  await unmountAll()
})

it('keeps loading status outside a list: the first item is always real data', async () => {
  const request = deferred<string[]>()
  const selected = vi.fn()
  const sidebar = mountApp(() => {
    const query = useQuery<string[]>({
      key: ['categories'],
      fetch: async () => request.promise,
    })
    return () =>
      h(QueryContent<string[]>, {
        query: query.value,
        pending: h('p', { role: 'status' }, 'Loading…'),
        children: (items) =>
          h(
            'ul',
            {},
            items.map((item) =>
              h(
                'li',
                { key: item },
                h('button', { class: 'category-pill', onClick: () => selected(item) }, item),
              ),
            ),
          ),
      })
  })
  expect(sidebar.host.querySelector('ul, .category-pill')).toBeNull()
  expect(sidebar.host.querySelector('[role="status"]')?.textContent).toBe('Loading…')

  request.resolve(['Books'])
  await settle()
  sidebar.host.querySelector<HTMLButtonElement>('ul > li:first-child button')!.click()
  expect(selected).toHaveBeenCalledExactlyOnceWith('Books')
})

it('does not expose a follow-like toggle before its target exists; the first click saves once', async () => {
  type Repository = { id: string; watched: boolean }
  const request = deferred<Repository>()
  const commit = vi.fn()
  const page = mountApp(() => {
    const query = useQuery<Repository>({
      key: ['repository', 'a'],
      fetch: async () => request.promise,
    })
    return () =>
      h(QueryContent<Repository>, {
        query: query.value,
        children: (repository) =>
          h(
            'button',
            { onClick: () => commit(repository.id, !repository.watched) },
            repository.watched ? 'Unwatch' : 'Watch',
          ),
      })
  })
  expect(page.host.querySelector('button')).toBeNull()
  request.resolve({ id: 'a', watched: false })
  await settle()
  page.host.querySelector<HTMLButtonElement>('button')!.click()
  expect(commit).toHaveBeenCalledExactlyOnceWith('a', true)
})

it('drops old record actions immediately when a new key has no data', async () => {
  getQueryClient().set(['repository', 'a'], { id: 'a' })
  const id = shallowRef('a')
  const page = mountApp(() => {
    const query = useQuery<{ id: string }>(() => ({
      key: ['repository', id.value],
      fetch: async () => new Promise<{ id: string }>(() => {}),
    }))
    return () =>
      h(QueryContent<{ id: string }>, {
        query: query.value,
        children: (record) => h('button', {}, record.id),
      })
  })
  expect(page.host.textContent).toBe('a')
  id.value = 'b'
  await nextTick()
  expect(page.host.querySelector('button')).toBeNull()
  await settle()
})

it('counterexample: cached data stays actionable through a pending and failed refresh', async () => {
  const client = getQueryClient()
  client.set(['book'], { id: 'one' })
  client.invalidate(['book'])
  let reject!: (error: Error) => void
  const request = new Promise<{ id: string }>((_resolve, fail) => {
    reject = fail
  })
  const error = vi.fn(() => h('p', { role: 'alert' }, 'Failed'))
  const page = mountApp(() => {
    const query = useQuery<{ id: string }>({ key: ['book'], fetch: async () => request })
    return () =>
      h(QueryContent<{ id: string }>, {
        query: query.value,
        error,
        children: (book) => h('button', {}, book.id),
      })
  })
  expect(page.host.querySelector('button')?.textContent).toBe('one')
  reject(new Error('Offline'))
  await settle()
  expect(page.host.querySelector('button')?.textContent).toBe('one')
  expect(error).not.toHaveBeenCalled()
})

it('an initial failure never mounts its resource actions and can recover on retry', async () => {
  let fail = true
  let retry: () => Promise<unknown> = async () => {}
  const page = mountApp(() => {
    const query = useQuery<{ id: string }>({
      key: ['book'],
      fetch: async () => {
        if (fail) throw Error('Offline')
        return { id: 'one' }
      },
    })
    retry = query.value.refetch
    return () =>
      h(QueryContent<{ id: string }>, {
        query: query.value,
        error: () => h('p', { role: 'alert' }, 'Failed'),
        children: (book) => h('button', {}, book.id),
      })
  })
  await settle()
  expect(page.host.querySelector('button')).toBeNull()
  expect(page.host.querySelector('[role="alert"]')?.textContent).toBe('Failed')
  fail = false
  await retry()
  await settle()
  expect(page.host.querySelector('button')?.textContent).toBe('one')
})

// Each case is wrapped: it.each spreads an array case into arguments, so a bare
// `[]` would pass no argument and test `undefined` instead of an empty array.
it.each([[false], [0], [''], [[]]])(
  'counterexample: valid empty or false data reaches the loaded branch (%j)',
  (data) => {
    const render = vi.fn(() => h('p', {}, 'Ready'))
    const page = mountComponent((props) =>
      h(QueryContent, {
        ...props,
        query: { data, status: 'success', error: undefined },
        children: render,
      }),
    )
    expect(render).toHaveBeenCalledWith(data)
    expect(page.host.textContent).toBe('Ready')
  },
)

it('a loaded null is missing rather than pending or actionable', () => {
  const children = vi.fn(() => h('button', {}, 'Act'))
  const page = mountComponent((props) =>
    h(QueryContent, {
      ...props,
      query: { data: null, status: 'success', error: undefined },
      missing: h('p', {}, 'Not found'),
      children,
    }),
  )
  expect(children).not.toHaveBeenCalled()
  expect(page.host.textContent).toBe('Not found')
})

// An edit form's own state: it starts from the record it mounted with and only
// its own Edit click changes the draft, the way the React package's form does.
const ScheduleForm = defineComponent({
  props: { title: { type: String, required: true } },
  setup(props) {
    const draft = ref(props.title)
    return () =>
      h('form', {}, [
        h('input', { value: draft.value, readonly: true }),
        h(
          'button',
          {
            type: 'button',
            onClick: () => {
              draft.value = 'Unsaved'
            },
          },
          'Edit',
        ),
      ])
  },
})

it('mounts the form with loaded values and resets it when an already cached record opens', async () => {
  const client = getQueryClient()
  client.set(['schedule', 'b'], { title: 'Thursday' })
  const id = shallowRef('a')
  const first = deferred<{ title: string }>()
  const page = mountApp(() => {
    const query = useQuery<{ title: string }>(() => ({
      key: ['schedule', id.value],
      fetch: async () => first.promise,
    }))
    return () =>
      h(QueryContent<{ title: string }>, {
        query: query.value,
        recordKey: id.value,
        pending: h('p', { role: 'status' }, 'Loading schedule'),
        children: (record) => h(ScheduleForm, record),
      })
  })
  expect(page.host.querySelector('form')).toBeNull()
  first.resolve({ title: 'Tuesday' })
  await settle()
  expect(page.host.querySelector<HTMLInputElement>('input')?.value).toBe('Tuesday')
  page.host.querySelector<HTMLButtonElement>('button')!.click()
  await nextTick()
  client.set(['schedule', 'a'], { title: 'Tuesday, revised' })
  await settle()
  expect(page.host.querySelector<HTMLInputElement>('input')?.value).toBe('Unsaved')
  id.value = 'b'
  await nextTick()
  expect(page.host.querySelector<HTMLInputElement>('input')?.value).toBe('Thursday')
})

it('keeps a previous query key out of the form until the new record arrives', async () => {
  const client = getQueryClient()
  client.set(['schedule', 'a'], { title: 'Tuesday' })
  const id = shallowRef('a')
  const second = deferred<{ title: string }>()
  const page = mountApp(() => {
    const query = useQuery<{ title: string }>(() => ({
      key: ['schedule', id.value],
      fetch: async () => second.promise,
      keepPreviousData: true,
      principal: 'public',
    }))
    return () =>
      h(QueryContent<{ title: string }>, {
        query: query.value,
        recordKey: id.value,
        pending: h('p', { role: 'status' }, 'Loading schedule'),
        children: (record) => h(ScheduleForm, record),
      })
  })
  await settle()
  expect(page.host.querySelector<HTMLInputElement>('input')?.value).toBe('Tuesday')
  id.value = 'b'
  await nextTick()
  expect(page.host.querySelector('form')).toBeNull()
  expect(page.host.querySelector('[role="status"]')?.textContent).toBe('Loading schedule')
  second.resolve({ title: 'Thursday' })
  await settle()
  expect(page.host.querySelector<HTMLInputElement>('input')?.value).toBe('Thursday')
})

it('counterexample: a form with static initial values retains its draft on rerender', async () => {
  const page = mountComponent(() => h(ScheduleForm, { title: 'New schedule' }))
  expect(page.host.querySelector<HTMLInputElement>('input')?.value).toBe('New schedule')
  page.host.querySelector<HTMLButtonElement>('button')!.click()
  await nextTick()
  await page.setProps({})
  expect(page.host.querySelector<HTMLInputElement>('input')?.value).toBe('Unsaved')
})
