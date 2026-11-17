import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  createQueryResource,
  getQueryClient,
  type QueryOptions,
  resetQueryClient,
  type ResourceHttp,
  setProvider,
} from '@molecule/app-query'

import { provider } from '../provider.js'

interface Equipment {
  id: string
  watched: boolean
  watchers: number
}
const cleanups: Array<() => void> = []
beforeEach(() => {
  resetQueryClient()
  setProvider(provider)
})
afterEach(() => {
  cleanups.splice(0).forEach((close) => close())
  resetQueryClient()
})

/** A real cache observer: mounted pages receive changes without re-subscribing. */
function observe<T>(options: QueryOptions<T>) {
  let value: T | undefined
  cleanups.push(
    getQueryClient().subscribe(options, (state) => {
      value = state.data
    }),
  )
  return () => value
}

function setup() {
  let row: Equipment = { id: 'pump-7', watched: false, watchers: 0 }
  const http: ResourceHttp = {
    get: async (path) => ({ data: path === '/equipment' ? [{ ...row }] : { ...row } }),
    post: async () => {
      row = { ...row, watched: true, watchers: 1 }
      return { data: { ...row } }
    },
    delete: async () => {
      row = { ...row, watched: false, watchers: 0 }
      return { data: { ...row } }
    },
    put: async () => ({ data: { ...row } }),
    patch: async () => ({ data: { ...row } }),
  }
  const resource = createQueryResource<Equipment>({
    name: 'equipment',
    path: '/equipment',
    http: () => http,
  })
  return { resource, http }
}

describe('resource actions on pages that remain mounted', () => {
  it('publishes both directions and the saved count to existing detail and list observers', async () => {
    const { resource } = setup()
    const detail = resource.detail('operator', 'pump-7')!
    const list = resource.list('operator')
    const currentDetail = observe(detail)
    const currentList = observe(list)
    await Promise.all([getQueryClient().fetch(detail), getQueryClient().fetch(list)])
    await resource.toggle('operator', 'pump-7', 'watch', true)
    expect(currentDetail()).toMatchObject({ watched: true, watchers: 1 })
    expect(currentList()).toEqual([{ id: 'pump-7', watched: true, watchers: 1 }])
    await resource.toggle('operator', 'pump-7', 'watch', false)
    expect(currentDetail()).toMatchObject({ watched: false, watchers: 0 })
    expect(currentList()).toEqual([{ id: 'pump-7', watched: false, watchers: 0 }])
  })

  it('keeps invalidation alone distinct from an active refresh for a custom HTTP mutation', async () => {
    const { resource, http } = setup()
    const options = resource.detail('operator', 'pump-7')!
    const value = observe(options)
    await getQueryClient().fetch(options)
    await http.post('/equipment/pump-7/watch')
    getQueryClient().invalidate(options.key)
    expect(value()).toMatchObject({ watched: false, watchers: 0 })
    await getQueryClient().fetch(options)
    expect(value()).toMatchObject({ watched: true, watchers: 1 })
  })

  it('does not publish an operator response to a different viewer', async () => {
    const { resource } = setup()
    const other = resource.detail('visitor', 'pump-7')!
    const value = observe(other)
    await getQueryClient().fetch(other)
    await resource.toggle('operator', 'pump-7', 'watch', true)
    expect(value()).toMatchObject({ watched: false, watchers: 0 })
  })

  it('preserves a complete filter catalogue beyond a preview-sized first page', async () => {
    const rows = Array.from({ length: 25 }, (_, id) => ({ id: String(id), label: `Area ${id}` }))
    const { http } = setup()
    http.get = async (_path, options) => ({
      data: options?.params?.limit === 10 ? rows.slice(0, 10) : rows,
    })
    const areas = createQueryResource<{ id: string; label: string }>({
      name: 'areas',
      path: '/areas',
      http: () => http,
    })
    const catalogue = areas.list('public')
    const value = observe(catalogue)
    await getQueryClient().fetch(catalogue)
    expect(value()).toEqual(rows)
    expect(value()?.at(-1)?.label).toBe('Area 24')
    // An explicit server-side limit is a different, valid contract.
    expect(await getQueryClient().fetch(areas.list('public', { limit: 10 }))).toEqual(
      rows.slice(0, 10),
    )
  })
})
