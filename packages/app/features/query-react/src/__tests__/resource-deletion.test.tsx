import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  configureQueryClient,
  getQueryClient,
  resetQueryClient,
  setProvider,
} from '@molecule/app-query'
import { provider as memory } from '@molecule/app-query-memory'
import { provider as tanstack } from '@molecule/app-query-tanstack'

import { createQueryResource, type ResourceHttp } from '../resource.js'
import { useQuery } from '../useQuery.js'

interface Task {
  id: string | number
  title: string
}

const roots: Root[] = []
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

afterEach(() => {
  for (const root of roots.splice(0)) act(() => root.unmount())
  resetQueryClient()
  configureQueryClient(undefined)
})

function server() {
  const rows: Task[] = [
    { id: 1, title: 'First' },
    { id: 'two', title: 'Second' },
  ]
  const http: ResourceHttp = {
    get: vi.fn(async () => ({ data: rows.map((row) => ({ ...row })) })),
    post: async (_path, body) => {
      const row = body as Task
      rows.push(row)
      return { data: row }
    },
    put: async (_path, body) => ({ data: body }),
    patch: async (_path, body) => ({ data: body }),
    // A successful DELETE with an empty or JSON body carries no replacement list.
    delete: vi.fn(async () => ({ data: undefined })),
  }
  return {
    rows,
    http,
    resource: createQueryResource<Task>({ name: 'tasks', path: '/tasks', http: () => http }),
  }
}

async function mountList(resource: ReturnType<typeof server>['resource'], viewer = 'reader') {
  const container = document.createElement('div')
  const root = createRoot(container)
  roots.push(root)
  function List() {
    const query = useQuery(resource.list(viewer))
    return createElement(
      'ul',
      null,
      query.data?.map((row) => createElement('li', { key: row.id }, row.title)),
    )
  }
  await act(async () => root.render(createElement(List)))
  return container
}

describe.each([
  { name: 'memory', provider: memory },
  { name: 'tanstack', provider: tanstack },
])('acknowledged resource deletions with $name', ({ provider }) => {
  beforeEach(() => {
    resetQueryClient()
    setProvider(provider)
    configureQueryClient({ staleMs: 0, gcMs: 0 })
  })

  it.each([undefined, {}])(
    'drops a row after any successful empty or JSON DELETE response: %#',
    async (body) => {
      const { http, resource } = server()
      vi.mocked(http.delete).mockResolvedValue({ data: body })
      const view = await mountList(resource)
      expect(view.textContent).toContain('First')
      await act(async () => resource.remove('reader', '1'))
      expect(view.textContent).toBe('Second')
      await act(async () => resource.refresh('reader'))
      expect(view.textContent).toBe('Second')
      expect(await getQueryClient().fetch(resource.detail('reader', '1')!)).toBeNull()
    },
  )

  it('removes a newly created row as well as initially loaded rows without local posted/removed arrays', async () => {
    const { resource } = server()
    const view = await mountList(resource)
    await act(async () => resource.create('reader', { id: 'new', title: 'Just created' }))
    expect(view.textContent).toContain('Just created')
    await act(async () => resource.remove('reader', 'new'))
    expect(view.textContent).toBe('FirstSecond')
  })

  it('updates the mounted list before the refresh finishes and rejects stale rows', async () => {
    const { http, resource } = server()
    const view = await mountList(resource)
    let finish!: (response: { data: Task[] }) => void
    vi.mocked(http.get).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    let removal!: Promise<void>
    await act(async () => {
      removal = resource.remove('reader', '1')
    })
    expect(view.textContent).toBe('Second')
    await act(async () => {
      finish({
        data: [
          { id: 1, title: 'Stale deleted row' },
          { id: 'two', title: 'Second' },
        ],
      })
      await removal
    })
    expect(view.textContent).toBe('Second')
  })

  it('keeps a row after a rejected delete and isolates successful deletes by viewer', async () => {
    const { http, resource } = server()
    const view = await mountList(resource)
    const other = await mountList(resource, 'other-reader')
    vi.mocked(http.delete).mockRejectedValueOnce(new Error('Forbidden'))
    await act(async () => {
      await expect(resource.remove('reader', '1')).rejects.toThrow('Forbidden')
    })
    expect(view.textContent).toBe('FirstSecond')
    await act(async () => resource.remove('reader', '1'))
    expect(view.textContent).toBe('Second')
    expect(other.textContent).toBe('FirstSecond')
  })

  it('accepts an explicit successful recreation of the same identity', async () => {
    const { resource, rows } = server()
    const view = await mountList(resource)
    await act(async () => resource.remove('reader', '1'))
    rows.splice(0, 1)
    await act(async () => resource.create('reader', { id: 1, title: 'Recreated' }))
    expect(view.textContent).toBe('SecondRecreated')
  })

  it('uses the configured identity field rather than requiring an id property', async () => {
    const { http } = server()
    vi.mocked(http.get).mockResolvedValue({ data: [{ code: 'a/b', name: 'Receipt' }] })
    const resource = createQueryResource<{ code: string; name: string }>({
      name: 'receipts',
      path: '/receipts',
      id: 'code',
      http: () => http,
    })
    const list = resource.list('reader')
    await getQueryClient().fetch(list)
    await resource.remove('reader', 'a/b')
    expect(getQueryClient().getState(list.key).data).toEqual([])
    expect(http.delete).toHaveBeenCalledWith('/receipts/a%2Fb')
  })

  it('projects opaque page envelopes with the caller adapter and leaves unadapted pages intact', async () => {
    const { http, resource } = server()
    const page = { rows: [{ id: 1, title: 'First' }], total: 1 }
    vi.mocked(http.get).mockResolvedValue({ data: page })
    const readPage = (response: { data: unknown }) => response.data as typeof page
    const adapted = resource.listPage('reader', {}, readPage, '/tasks', (value, id) => {
      const rows = value.rows.filter((row) => String(row.id) !== id)
      return { ...value, rows, total: value.total - (value.rows.length - rows.length) }
    })
    const opaque = resource.listPage('reader', {}, readPage, '/tasks/report')
    await getQueryClient().fetch(adapted)
    await getQueryClient().fetch(opaque)
    await resource.remove('reader', '1')
    expect(getQueryClient().getState(adapted.key).data).toEqual({ rows: [], total: 0 })
    expect(getQueryClient().getState(opaque.key).data).toEqual(page)
  })
})
