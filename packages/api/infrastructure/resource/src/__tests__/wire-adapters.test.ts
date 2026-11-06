import { describe, expect, it, vi } from 'vitest'

import { createRequestHandler } from '../createRequestHandler.js'
import type { MoleculeRequest, MoleculeResponse } from '../http-types.js'

const context = () => {
  const req = Object.assign(Object.create({ get: () => 'inherited header' }), {
    body: { account: { email: 'reader@example.test' } },
    params: {},
    query: {},
    headers: {},
  }) as MoleculeRequest
  const res = {
    locals: { session: { userId: 'reader' } },
    set: vi.fn(),
    status: vi.fn().mockReturnThis(),
    send: vi.fn(),
  } as unknown as MoleculeResponse
  return { req, res, next: vi.fn() }
}

describe('resource wire adapters', () => {
  it('adapts an async request envelope before the existing handler validates it', async () => {
    const { req, res, next } = context()
    const original = req.body
    const handler = vi.fn((request: MoleculeRequest) => ({
      statusCode: typeof request.body.email === 'string' ? 201 : 400,
      body: {
        email: request.body.email,
        inherited: (request as MoleculeRequest & { get(): string }).get(),
      },
    }))
    await createRequestHandler(handler, {
      mapRequest: async (request) => ({ body: request.body.account }),
    })(req, res, next)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.send).toHaveBeenCalledWith({
      email: 'reader@example.test',
      inherited: 'inherited header',
    })
    expect(req.body).toBe(original)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(next).not.toHaveBeenCalled()
  })

  it('awaits the response mapping and keeps status, headers and session context', async () => {
    const { req, res, next } = context()
    await createRequestHandler(
      () => ({ statusCode: 201, headers: { Location: '/readers/reader' }, body: { id: 'reader' } }),
      {
        mapResponse: async (response, request, responseContext) => {
          expect(request).toBe(req)
          expect(responseContext.locals.session.userId).toBe('reader')
          return { ...response, body: { account: response.body } }
        },
      },
    )(req, res, next)
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.set).toHaveBeenCalledWith({ Location: '/readers/reader' })
    expect(res.send).toHaveBeenCalledWith({ account: { id: 'reader' } })
    expect(next).not.toHaveBeenCalled()
  })

  it('gives the response mapper the adapted request', async () => {
    const { req, res, next } = context()
    await createRequestHandler((request) => ({ statusCode: 200, body: request.body }), {
      mapRequest: (request) => ({ body: request.body.account }),
      mapResponse: (response, request) => ({ ...response, body: { email: request.body.email } }),
    })(req, res, next)
    expect(res.send).toHaveBeenCalledWith({ email: 'reader@example.test' })
  })

  it('shadows a read-only framework query accessor without mutating the request', async () => {
    const { req, res, next } = context()
    Object.defineProperty(req, 'query', {
      get: () => ({ handle: 'public-name' }),
      configurable: true,
    })
    const inherited = Object.getPrototypeOf(req)
    await createRequestHandler(
      (request) => ({
        statusCode: 200,
        body: {
          query: request.query,
          headers: request.headers,
          inherited: Object.getPrototypeOf(request),
        },
      }),
      {
        mapRequest: () => ({ query: { author: 'author-id' } }),
      },
    )(req, res, next)
    expect(res.send).toHaveBeenCalledWith({
      query: { author: 'author-id' },
      headers: req.headers,
      inherited: req,
    })
    expect(req.query).toEqual({ handle: 'public-name' })
    expect(Object.getPrototypeOf(req)).toBe(inherited)
  })

  it.each([200, 422])(
    'can answer %s before the handler and still apply the response adapter',
    async (statusCode) => {
      const { req, res, next } = context()
      const handler = vi.fn(() => ({ statusCode: 201, body: 'must not run' }))
      await createRequestHandler(handler, {
        mapRequest: () => ({
          response: {
            statusCode,
            headers: { 'X-Policy': 'local' },
            body: { reason: 'local contract' },
          },
        }),
        mapResponse: (result, request) => {
          expect(request).toBe(req)
          return { ...result, body: { result: result.body } }
        },
      })(req, res, next)
      expect(handler).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(statusCode)
      expect(res.set).toHaveBeenCalledWith({ 'X-Policy': 'local' })
      expect(res.send).toHaveBeenCalledWith({ result: { reason: 'local contract' } })
      expect(next).not.toHaveBeenCalled()
    },
  )

  it.each([null, undefined])(
    'keeps %s fall-through and never maps an absent response',
    async (result) => {
      const { req, res, next } = context()
      const mapResponse = vi.fn()
      await createRequestHandler(() => result, { mapResponse })(req, res, next)
      expect(mapResponse).not.toHaveBeenCalled()
      expect(res.send).not.toHaveBeenCalled()
      expect(next).toHaveBeenCalledExactlyOnceWith()
    },
  )

  it.each(['request', 'response'])(
    'forwards a rejected %s mapping to the existing error boundary',
    async (stage) => {
      const { req, res, next } = context()
      const handler = vi.fn(() => ({ statusCode: 200, body: 'ok' }))
      const reject = async () => {
        throw new Error('adapter rejected')
      }
      await createRequestHandler(
        handler,
        stage === 'request' ? { mapRequest: reject } : { mapResponse: reject },
      )(req, res, next)
      expect(res.send).not.toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
      expect(next).toHaveBeenCalledTimes(1)
      if (stage === 'request') expect(handler).not.toHaveBeenCalled()
      else expect(handler).toHaveBeenCalledTimes(1)
    },
  )

  it('does not infer an envelope when no mapping was configured', async () => {
    const { req, res, next } = context()
    const response = { statusCode: 422, body: { errors: { account: ['requires a flat body'] } } }
    await createRequestHandler((request) => {
      expect(request).toBe(req)
      return response
    })(req, res, next)
    expect(res.status).toHaveBeenCalledWith(422)
    expect(res.send).toHaveBeenCalledWith(response.body)
  })

  it.each([206, 400, 401, 403, 500])(
    'lets an adapter preserve the native %s non-success result',
    async (statusCode) => {
      const { req, res, next } = context()
      const response = {
        statusCode,
        headers: { 'X-Policy': 'original' },
        body: { errorKey: 'account.denied' },
      }
      await createRequestHandler(() => response, {
        mapResponse: (result) =>
          'profile' in result.body ? { ...result, body: { account: result.body.profile } } : result,
      })(req, res, next)
      expect(res.status).toHaveBeenCalledWith(statusCode)
      expect(res.set).toHaveBeenCalledWith(response.headers)
      expect(res.send).toHaveBeenCalledWith(response.body)
    },
  )
})
