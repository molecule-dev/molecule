// @vitest-environment jsdom
/**
 * Acknowledged resource deletions, driven through a real Angular page and both
 * query bonds: a successful DELETE drops the row from every mounted list at
 * once, a stale refresh cannot restore it, and another viewer's list keeps its
 * rows.
 *
 * @module
 */
import '@angular/compiler'
import { ChangeDetectionStrategy, Component, type Type } from '@angular/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { QueryResource } from '@molecule/app-query'
import {
  configureQueryClient,
  getQueryClient,
  resetQueryClient,
  setProvider,
} from '@molecule/app-query'
import { provider as memory } from '@molecule/app-query-memory'
import { provider as tanstack } from '@molecule/app-query-tanstack'

import { createQueryResource, type ResourceHttp, useQuery } from '../index.js'
import { type ComponentMount, drain, mountComponent } from './harness.js'

interface Task {
  id: string | number
  title: string
}

/** Host selectors minted so far (each page defines its own component). */
let pageCount = 0

afterEach(() => {
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

/** A real page that renders the resource's rows, the way the app's list does. */
async function mountList(
  resource: QueryResource<Task>,
  viewer = 'reader',
): Promise<ComponentMount<object>> {
  const List = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: `mol-task-list-${++pageCount}`,
    standalone: true,
    template: `<ul>
      @for (row of query.data ?? []; track row.id) {
        <li>{{ row.title }}</li>
      }
    </ul>`,
  })(
    class TaskList {
      readonly query = useQuery(resource.list(viewer))
    },
  ) as Type<object>
  const mounted = await mountComponent(List)
  // The first load answers asynchronously: settle it, the way React's
  // `await act(async () => root.render(...))` does before the first assertion.
  await mounted.settle()
  return mounted
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
      expect(view.host.textContent).toContain('First')
      await resource.remove('reader', '1')
      await view.settle()
      expect(view.host.textContent).toBe('Second')
      await resource.refresh('reader')
      await view.settle()
      expect(view.host.textContent).toBe('Second')
      expect(await getQueryClient().fetch(resource.detail('reader', '1')!)).toBeNull()
    },
  )

  it('removes a newly created row as well as initially loaded rows without local posted/removed arrays', async () => {
    const { resource } = server()
    const view = await mountList(resource)
    await resource.create('reader', { id: 'new', title: 'Just created' })
    await view.settle()
    expect(view.host.textContent).toContain('Just created')
    await resource.remove('reader', 'new')
    await view.settle()
    expect(view.host.textContent).toBe('FirstSecond')
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
    const removal = resource.remove('reader', '1')
    await drain()
    await view.settle()
    expect(view.host.textContent).toBe('Second')
    finish({
      data: [
        { id: 1, title: 'Stale deleted row' },
        { id: 'two', title: 'Second' },
      ],
    })
    await removal
    await view.settle()
    expect(view.host.textContent).toBe('Second')
  })

  it('keeps a row after a rejected delete and isolates successful deletes by viewer', async () => {
    const { http, resource } = server()
    const view = await mountList(resource)
    const other = await mountList(resource, 'other-reader')
    vi.mocked(http.delete).mockRejectedValueOnce(new Error('Forbidden'))
    await expect(resource.remove('reader', '1')).rejects.toThrow('Forbidden')
    await view.settle()
    expect(view.host.textContent).toBe('FirstSecond')
    await resource.remove('reader', '1')
    await view.settle()
    expect(view.host.textContent).toBe('Second')
    expect(other.host.textContent).toBe('FirstSecond')
  })

  it('accepts an explicit successful recreation of the same identity', async () => {
    const { resource, rows } = server()
    const view = await mountList(resource)
    await resource.remove('reader', '1')
    rows.splice(0, 1)
    await resource.create('reader', { id: 1, title: 'Recreated' })
    await view.settle()
    expect(view.host.textContent).toBe('SecondRecreated')
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
