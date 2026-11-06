import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  MoleculeRequest,
  MoleculeResponse,
  RequestHandlerOptions,
} from '@molecule/api-resource'

const service = vi.hoisted(() => ({
  allTags: vi.fn(),
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
vi.mock('@molecule/api-logger', () => ({ logger: { error: vi.fn() } }))
vi.mock('@molecule/api-i18n', () => ({
  t: (key: string, _values: unknown, options?: { defaultValue?: string }) =>
    options?.defaultValue ?? key,
}))

import * as handlers from '../handlers/index.js'

// The untouched package has only the default named handlers. This fallback runs
// that real old boundary in the before-control, so missing configuration fails
// an HTTP assertion instead of an import/setup error.
const configured = (options: RequestHandlerOptions) =>
  'createArticleHandlers' in handlers ? handlers.createArticleHandlers(options) : handlers

const request = (parts: Partial<MoleculeRequest> = {}): MoleculeRequest => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  ...parts,
})
const response = (userId?: string) => {
  const state = {
    statusCode: 200,
    body: undefined as unknown,
    ended: false,
    locals: userId ? { session: { userId } } : {},
    status(code: number) {
      state.statusCode = code
      return state
    },
    json(body: unknown) {
      state.body = body
      return state
    },
    end() {
      state.ended = true
    },
    set: vi.fn(),
  }
  return state
}
const http = (res: ReturnType<typeof response>): MoleculeResponse =>
  res as unknown as MoleculeResponse
const nativeArticle = {
  slug: 'launch',
  title: 'Launch',
  body: 'Our launch',
  authorId: 'editor',
  favorited: false,
}

beforeEach(() => {
  for (const mock of Object.values(service)) mock.mockReset()
})

describe('configured article handlers', () => {
  const envelope: RequestHandlerOptions = {
    mapRequest: async (req) => ({ body: req.body?.entry }),
    mapResponse: async (result) =>
      result.statusCode < 400 && result.statusCode !== 204
        ? { ...result, body: { entry: result.body } }
        : result,
  }

  it('uses a nested create body and an async response projection without rewriting create', async () => {
    service.createArticle.mockResolvedValue(nativeArticle)
    const req = request({
      body: { entry: { title: 'Launch', body: 'Our launch', authorId: 'attacker' } },
    })
    const res = response('editor')
    await configured(envelope).create(req, http(res))
    expect(res.statusCode).toBe(201)
    expect(res.body).toEqual({ entry: nativeArticle })
    expect(service.createArticle).toHaveBeenCalledExactlyOnceWith('editor', {
      title: 'Launch',
      body: 'Our launch',
    })
    expect(req.body).toHaveProperty('entry')
  })

  it('resolves an external author handle and projects a paginated list in one callback', async () => {
    service.listArticles.mockResolvedValue({
      data: [nativeArticle],
      total: 12,
      limit: 2,
      offset: 3,
    })
    const res = response('reader')
    await configured({
      mapRequest: async (req) =>
        Object.assign(Object.create(req), { query: { ...req.query, author: 'editor' } }),
      mapResponse: async (result) => ({
        ...result,
        body: { entries: result.body.data, count: result.body.total },
      }),
    }).list(request({ query: { author: 'editor-handle', limit: '2', offset: '3' } }), http(res))
    expect(service.listArticles).toHaveBeenCalledExactlyOnceWith({
      tag: undefined,
      authorId: 'editor',
      favoritedBy: undefined,
      limit: 2,
      offset: 3,
      viewerId: 'reader',
    })
    expect(res.body).toEqual({ entries: [nativeArticle], count: 12 })
  })

  it('answers an unresolved filter before querying instead of dropping it and listing everything', async () => {
    service.listArticles.mockResolvedValue({
      data: [nativeArticle],
      total: 1,
      limit: 20,
      offset: 0,
    })
    const res = response()
    await configured({
      mapRequest: () => ({
        response: { statusCode: 200, body: { data: [], total: 0, limit: 20, offset: 0 } },
      }),
    }).list(request({ query: { author: 'missing-handle' } }), http(res))
    expect(res.body).toEqual({ data: [], total: 0, limit: 20, offset: 0 })
    expect(service.listArticles).not.toHaveBeenCalled()
  })

  it('adapts reads and preserves viewer-dependent data', async () => {
    service.getArticleBySlug.mockResolvedValue({ ...nativeArticle, favorited: true })
    const res = response('reader')
    await configured(envelope).read(request({ params: { slug: 'launch' } }), http(res))
    expect(service.getArticleBySlug).toHaveBeenCalledExactlyOnceWith('launch', 'reader')
    expect(res.body).toEqual({ entry: { ...nativeArticle, favorited: true } })
  })

  it('keeps anonymous writes unauthorized after request adaptation', async () => {
    const res = response()
    await configured(envelope).create(
      request({ body: { entry: { title: 'Launch', body: 'Our launch' } } }),
      http(res),
    )
    expect(res.statusCode).toBe(401)
    expect(service.createArticle).not.toHaveBeenCalled()
    expect(res.body).toMatchObject({ errorKey: 'resource.error.unauthorized' })
  })

  it('validates the adapted body before writing', async () => {
    const res = response('editor')
    await configured(envelope).create(
      request({ body: { entry: { title: '', body: 'Text' } } }),
      http(res),
    )
    expect(res.statusCode).toBe(400)
    expect(service.createArticle).not.toHaveBeenCalled()
  })

  it('adapts update input while keeping the service author check', async () => {
    service.updateArticle.mockResolvedValue({ status: 'ok', article: nativeArticle })
    const res = response('editor')
    await configured(envelope).update(
      request({ params: { slug: 'launch' }, body: { entry: { title: 'Launch' } } }),
      http(res),
    )
    expect(service.updateArticle).toHaveBeenCalledExactlyOnceWith('launch', 'editor', {
      title: 'Launch',
    })
    expect(res.body).toEqual({ entry: nativeArticle })

    service.updateArticle.mockResolvedValue({ status: 'forbidden' })
    const denied = response('intruder')
    await configured(envelope).update(
      request({ params: { slug: 'launch' }, body: { entry: { title: 'Stolen' } } }),
      http(denied),
    )
    expect(denied.statusCode).toBe(403)
    expect(denied.body).toMatchObject({ errorKey: 'article.error.notAuthor' })
  })

  it('keeps an empty delete response and preserves mapped headers', async () => {
    service.deleteArticle.mockResolvedValue({ status: 'ok' })
    const res = response('editor')
    await configured({
      mapResponse: (result) => ({ ...result, headers: { 'X-Archive': 'deleted' } }),
    }).del(request({ params: { slug: 'launch' } }), http(res))
    expect(res.statusCode).toBe(204)
    expect(res.ended).toBe(true)
    expect(res.body).toBeUndefined()
    expect(res.set).toHaveBeenCalledWith({ 'X-Archive': 'deleted' })
  })

  it.each(['favorite', 'unfavorite'] as const)(
    'adapts the %s response without changing idempotent service selection',
    async (operation) => {
      service.setFavorite.mockResolvedValue(nativeArticle)
      const res = response('reader')
      await configured(envelope)[operation](request({ params: { slug: 'launch' } }), http(res))
      expect(service.setFavorite).toHaveBeenCalledExactlyOnceWith(
        'launch',
        'reader',
        operation === 'favorite',
      )
      expect(res.body).toEqual({ entry: nativeArticle })
    },
  )

  it('adapts tags and the followed-author feed', async () => {
    service.allTags.mockResolvedValue([{ tag: 'news', count: 1 }])
    service.getFeed.mockResolvedValue({ data: [nativeArticle], total: 1, limit: 20, offset: 0 })
    const mapped = configured({
      mapResponse: (result) => ({ ...result, body: { archive: result.body } }),
    })
    const tags = response()
    await mapped.tags(request(), http(tags))
    expect(tags.body).toEqual({ archive: [{ tag: 'news', count: 1 }] })
    const feed = response('reader')
    await mapped.feed(request(), http(feed))
    expect(feed.body).toMatchObject({ archive: { total: 1 } })
  })

  it('keeps default handlers independent from a configured instance', async () => {
    service.createArticle.mockResolvedValue(nativeArticle)
    configured(envelope)
    const res = response('editor')
    await handlers.create(request({ body: { title: 'Launch', body: 'Our launch' } }), http(res))
    expect(res.statusCode).toBe(201)
    expect(res.body).toBe(nativeArticle)
    const nested = response('editor')
    await handlers.create(
      request({ body: { entry: { title: 'Launch', body: 'Our launch' } } }),
      http(nested),
    )
    expect(nested.statusCode).toBe(400)
  })

  it.each(['request', 'response'])(
    'answers a failed %s adapter without leaving the request unanswered',
    async (stage) => {
      service.getArticleBySlug.mockResolvedValue(nativeArticle)
      const reject = async () => {
        throw new Error('projection unavailable')
      }
      const res = response()
      await configured(stage === 'request' ? { mapRequest: reject } : { mapResponse: reject }).read(
        request({ params: { slug: 'launch' } }),
        http(res),
      )
      expect(res.statusCode).toBe(500)
      expect(res.body).toMatchObject({ errorKey: 'resource.error.unknownError' })
    },
  )
})
