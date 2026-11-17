import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  createQueryResource,
  getQueryClient,
  resetQueryClient,
  type ResourceHttp,
  setProvider,
} from '@molecule/app-query'

import { provider } from '../provider.js'

interface Member {
  username: string
  following: boolean
}

afterEach(() => resetQueryClient())

describe('persisted resource action direction', () => {
  it.each(['follow', 'watch'])(
    'persists %s before a reload and a dependent collection read',
    async (action) => {
      setProvider(provider)
      const member = { username: 'Ada / Team', following: false }
      const write = (on: boolean) => async () => {
        member.following = on
        return { data: { member: { ...member } } }
      }
      const http: ResourceHttp = {
        get: vi.fn(async (path) => ({
          data: path.endsWith('/updates')
            ? { updates: member.following ? [{ id: 'update-1' }] : [] }
            : { member: { ...member } },
        })),
        post: vi.fn(write(true)),
        delete: vi.fn(write(false)),
        put: vi.fn(write(true)),
        patch: vi.fn(write(true)),
      }
      const config = {
        name: 'members',
        path: '/members',
        id: 'username' as const,
        http: () => http,
        readOne: ({ data }: { data: unknown }) => (data as { member: Member }).member,
      }
      const resource = createQueryResource<Member>(config)
      const selected = await resource.toggle('viewer', member.username, action, true)
      expect(selected.following).toBe(true)
      expect(http.post).toHaveBeenCalledExactlyOnceWith(`/members/Ada%20%2F%20Team/${action}`)
      expect(http.delete).not.toHaveBeenCalled()
      expect((await http.get('/members/updates')).data).toEqual({ updates: [{ id: 'update-1' }] })

      // A new page/resource reads the persisted answer, not the optimistic button state.
      const remounted = createQueryResource<Member>(config)
      const detail = remounted.detail('viewer', member.username)!
      getQueryClient().invalidate(detail.key)
      expect((await getQueryClient().fetch(detail))?.following).toBe(true)

      expect((await remounted.toggle('viewer', member.username, action, false)).following).toBe(
        false,
      )
      expect(http.delete).toHaveBeenCalledExactlyOnceWith(`/members/Ada%20%2F%20Team/${action}`)
      expect((await http.get('/members/updates')).data).toEqual({ updates: [] })
    },
  )

  it('returns the saved star count instead of treating optimistic display as persistence', async () => {
    setProvider(provider)
    const document = { id: 'manual', starred: false, stars: 4 }
    const write = (on: boolean) => async () => {
      document.starred = on
      document.stars = on ? 5 : 4
      return { data: { document: { ...document } } }
    }
    const http: ResourceHttp = {
      get: vi.fn(async () => ({ data: { document: { ...document } } })),
      post: vi.fn(write(true)),
      delete: vi.fn(write(false)),
      put: vi.fn(write(true)),
      patch: vi.fn(write(true)),
    }
    const resource = createQueryResource<typeof document>({
      name: 'documents',
      path: '/documents',
      http: () => http,
      readOne: ({ data }) => (data as { document: typeof document }).document,
    })
    expect(await resource.toggle('reader', 'manual', 'star', true)).toMatchObject({
      starred: true,
      stars: 5,
    })
    expect(await resource.toggle('reader', 'manual', 'star', false)).toMatchObject({
      starred: false,
      stars: 4,
    })
    expect(http.post).toHaveBeenCalledExactlyOnceWith('/documents/manual/star')
    expect(http.delete).toHaveBeenCalledExactlyOnceWith('/documents/manual/star')
  })

  it('propagates a failed action without issuing the opposite request', async () => {
    setProvider(provider)
    const error = new Error('write refused')
    const http = {
      post: vi.fn(async () => {
        throw error
      }),
      delete: vi.fn(async () => ({ data: { id: 'record' } })),
    }
    const resource = createQueryResource<{ id: string }>({
      name: 'records',
      path: '/records',
      http: () => http as unknown as ResourceHttp,
    })
    const rejection = await resource.toggle('viewer', 'record', 'watch', true).then(
      () => undefined,
      (failure: unknown) => failure,
    )
    expect(rejection).toBe(error)
    expect(http.post).toHaveBeenCalledOnce()
    expect(http.delete).not.toHaveBeenCalled()
  })

  it('keeps an API with a boolean PUT body on its explicit update path', async () => {
    setProvider(provider)
    const http = {
      put: vi.fn(async (_path: string, body: unknown) => ({
        data: { id: 'sensor', ...(body as object) },
      })),
      post: vi.fn(),
      delete: vi.fn(),
    }
    const resource = createQueryResource<{ id: string; muted: boolean }>({
      name: 'sensors',
      path: '/sensors',
      http: () => http as unknown as ResourceHttp,
    })
    expect(await resource.update('operator', 'sensor', { muted: true })).toEqual({
      id: 'sensor',
      muted: true,
    })
    expect(http.put).toHaveBeenCalledExactlyOnceWith('/sensors/sensor', { muted: true })
    expect(http.post).not.toHaveBeenCalled()
    expect(http.delete).not.toHaveBeenCalled()
  })
})
