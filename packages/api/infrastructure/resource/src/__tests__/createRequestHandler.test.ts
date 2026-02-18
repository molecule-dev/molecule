/**
 * Tests for the createRequestHandler utility.
 */

import type { NextFunction, Request, Response } from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createRequestHandler,
  type Handler,
  type Response as HandlerResponse,
} from '../createRequestHandler.js'

// Mock logger
vi.mock('@molecule/api-logger', () => ({
  logger: {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Helper to create mock request/response
const createMockContext = (): { req: Request; res: Response; next: NextFunction } => {
  const req = {} as Request
  const res = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  } as unknown as Response
  const next = vi.fn() as NextFunction

  return { req, res, next }
}

describe('createRequestHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should send response with status code and body', async () => {
    const { req, res, next } = createMockContext()

    const handler: Handler = async () => ({
      statusCode: 200,
      body: { message: 'Success' },
    })

    const wrappedHandler = createRequestHandler(handler)
    await wrappedHandler(req, res, next)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.send).toHaveBeenCalledWith({ message: 'Success' })
    expect(next).not.toHaveBeenCalled()
  })

  it('should set custom headers', async () => {
    const { req, res, next } = createMockContext()

    const handler: Handler = async () => ({
      statusCode: 200,
      headers: {
        'X-Custom-Header': 'custom-value',
        'X-Another-Header': 'another-value',
      },
      body: { message: 'Success' },
    })

    const wrappedHandler = createRequestHandler(handler)
    await wrappedHandler(req, res, next)

    expect(res.set).toHaveBeenCalledWith({
      'X-Custom-Header': 'custom-value',
      'X-Another-Header': 'another-value',
    })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.send).toHaveBeenCalledWith({ message: 'Success' })
  })

  it('should call next when handler returns null', async () => {
    const { req, res, next } = createMockContext()

    const handler: Handler = async () => null

    const wrappedHandler = createRequestHandler(handler)
    await wrappedHandler(req, res, next)

    expect(res.status).not.toHaveBeenCalled()
    expect(res.send).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledWith()
  })

  it('should call next when handler returns undefined', async () => {
    const { req, res, next } = createMockContext()

    const handler: Handler = async () => undefined

    const wrappedHandler = createRequestHandler(handler)
    await wrappedHandler(req, res, next)

    expect(res.status).not.toHaveBeenCalled()
    expect(res.send).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('should call next with error when handler throws', async () => {
    const { req, res, next } = createMockContext()

    const handler: Handler = async () => {
      throw new Error('Something went wrong')
    }

    const wrappedHandler = createRequestHandler(handler)
    await wrappedHandler(req, res, next)

    expect(res.status).not.toHaveBeenCalled()
    expect(res.send).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledWith('Something went wrong.')
  })

  it('should handle sync handlers', async () => {
    const { req, res, next } = createMockContext()

    const handler: Handler = () => ({
      statusCode: 201,
      body: { created: true },
    })

    const wrappedHandler = createRequestHandler(handler)
    await wrappedHandler(req, res, next)

    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.send).toHaveBeenCalledWith({ created: true })
  })

  it('should handle different status codes', async () => {
    const { req, res, next } = createMockContext()

    const testCases: Array<{ statusCode: number; body: HandlerResponse['body'] }> = [
      { statusCode: 200, body: { success: true } },
      { statusCode: 201, body: { created: true } },
      { statusCode: 400, body: { error: 'Bad request' } },
      { statusCode: 404, body: { error: 'Not found' } },
      { statusCode: 500, body: { error: 'Server error' } },
    ]

    for (const testCase of testCases) {
      vi.clearAllMocks()

      const handler: Handler = async () => testCase

      const wrappedHandler = createRequestHandler(handler)
      await wrappedHandler(req, res, next)

      expect(res.status).toHaveBeenCalledWith(testCase.statusCode)
      expect(res.send).toHaveBeenCalledWith(testCase.body)
    }
  })

  it('should handle array body', async () => {
    const { req, res, next } = createMockContext()

    const handler: Handler = async () => ({
      statusCode: 200,
      body: [{ id: 1 }, { id: 2 }, { id: 3 }],
    })

    const wrappedHandler = createRequestHandler(handler)
    await wrappedHandler(req, res, next)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.send).toHaveBeenCalledWith([{ id: 1 }, { id: 2 }, { id: 3 }])
  })
})
