/**
 * Article handlers: who may call what, what bad input gets, and the status
 * each outcome answers with. The service is stubbed; service.test.ts runs it
 * against a real database.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const service = vi.hoisted(() => ({
  createArticle: vi.fn(),
  deleteArticle: vi.fn(),
  getArticleBySlug: vi.fn(),
  getFeed: vi.fn(),
  listArticles: vi.fn(),
  popularTags: vi.fn(),
  setFavorite: vi.fn(),
  updateArticle: vi.fn(),
}))
vi.mock('../service.js', () => service)
vi.mock('@molecule/api-logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))
vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _v: unknown, opts?: { defaultValue?: string }) => opts?.defaultValue ?? _key,
}))

import { create, del, favorite, feed, list, read, update } from '../handlers/index.js'

interface FakeRes {
  statusCode: number
  body: unknown
  ended: boolean
  locals: { session?: { userId: string } }
  status(code: number): FakeRes
  json(body: unknown): FakeRes
  end(): FakeRes
}
const res = (userId?: string): FakeRes => {
  const r: FakeRes = {
    statusCode: 200,
    body: undefined,
    ended: false,
    locals: userId ? { session: { userId } } : {},
    status(code) {
      r.statusCode = code
      return r
    },
    json(body) {
      r.body = body
      return r
    },
    end() {
      r.ended = true
      return r
    },
  }
  return r
}
const req = (parts: { body?: unknown; params?: Record<string, string>; query?: object } = {}) =>
  ({ body: parts.body ?? {}, params: parts.params ?? {}, query: parts.query ?? {} }) as never

beforeEach(() => {
  for (const fn of Object.values(service)) fn.mockReset()
})

describe('article handlers', () => {
  it('create needs a session and valid input, then answers 201', async () => {
    const anon = res()
    await create(req({ body: { title: 'T', body: 'B' } }), anon as never)
    expect(anon.statusCode).toBe(401)

    const bad = res('u1')
    await create(req({ body: { title: '', body: 'B' } }), bad as never)
    expect(bad.statusCode).toBe(400)
    expect(service.createArticle).not.toHaveBeenCalled()

    service.createArticle.mockResolvedValue({ slug: 't' })
    const ok = res('u1')
    await create(
      req({ body: { title: 'T', body: 'B', tagList: ['a'], authorId: 'evil' } }),
      ok as never,
    )
    expect(ok.statusCode).toBe(201)
    // The author is the session user; a client-sent authorId is not passed on.
    expect(service.createArticle).toHaveBeenCalledWith('u1', {
      title: 'T',
      body: 'B',
      tagList: ['a'],
    })
  })

  it('list passes the filters and the viewer through', async () => {
    service.listArticles.mockResolvedValue({ data: [], total: 0, limit: 5, offset: 0 })
    await list(
      req({ query: { tag: 'x', author: 'a1', favoritedBy: 'b1', limit: '5', offset: 'nope' } }),
      res('v1') as never,
    )
    expect(service.listArticles).toHaveBeenCalledWith({
      tag: 'x',
      authorId: 'a1',
      favoritedBy: 'b1',
      limit: 5,
      offset: undefined,
      viewerId: 'v1',
    })
  })

  it('feed needs a session', async () => {
    const anon = res()
    await feed(req(), anon as never)
    expect(anon.statusCode).toBe(401)
    expect(service.getFeed).not.toHaveBeenCalled()
  })

  it('answers 404 for a missing article and 403 for someone else’s', async () => {
    service.getArticleBySlug.mockResolvedValue(null)
    const missing = res()
    await read(req({ params: { slug: 'nope' } }), missing as never)
    expect(missing.statusCode).toBe(404)

    service.updateArticle.mockResolvedValue({ status: 'forbidden' })
    const notMine = res('u2')
    await update(req({ params: { slug: 's' }, body: { body: 'x' } }), notMine as never)
    expect(notMine.statusCode).toBe(403)

    service.deleteArticle.mockResolvedValue({ status: 'ok', article: true })
    const gone = res('u1')
    await del(req({ params: { slug: 's' } }), gone as never)
    expect(gone.statusCode).toBe(204)
    expect(gone.ended).toBe(true)

    service.setFavorite.mockResolvedValue(null)
    const noFav = res('u1')
    await favorite(req({ params: { slug: 'nope' } }), noFav as never)
    expect(noFav.statusCode).toBe(404)
  })

  it('answers 500 when the service throws', async () => {
    service.listArticles.mockRejectedValue(new Error('db down'))
    const r = res()
    await list(req(), r as never)
    expect(r.statusCode).toBe(500)
    expect(r.body).toMatchObject({ errorKey: 'article.error.listFailed' })
  })
})
