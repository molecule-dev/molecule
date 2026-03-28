import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { validate, validateBody, validateParams, validateQuery } from '../validate.js'
import { paginationSchema, idParamSchema, searchQuerySchema } from '../schemas.js'
import { paginated, success, error } from '../response.js'

/**
 * Creates a minimal mock Express request.
 */
function mockRequest(overrides: Partial<Request> = {}): Request {
  return {
    body: {},
    params: {},
    query: {},
    ...overrides,
  } as Request
}

/**
 * Creates a minimal mock Express response with spied methods.
 */
function mockResponse(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  }
  return res as unknown as Response
}

describe('validate', () => {
  let next: NextFunction

  beforeEach(() => {
    next = vi.fn()
  })

  describe('body validation', () => {
    const schema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
    })

    it('passes valid body and calls next', () => {
      const req = mockRequest({ body: { name: 'Alice', email: 'alice@example.com' } })
      const res = mockResponse()
      const middleware = validate({ body: schema })

      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(req.body).toEqual({ name: 'Alice', email: 'alice@example.com' })
      expect(res.status).not.toHaveBeenCalled()
    })

    it('returns 400 with errors for invalid body', () => {
      const req = mockRequest({ body: { name: '', email: 'not-an-email' } })
      const res = mockResponse()
      const middleware = validate({ body: schema })

      middleware(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          errors: expect.arrayContaining([
            expect.objectContaining({ field: expect.any(String), message: expect.any(String), code: expect.any(String) }),
          ]),
        }),
      )
    })

    it('returns 400 for missing required fields', () => {
      const req = mockRequest({ body: {} })
      const res = mockResponse()
      const middleware = validate({ body: schema })

      middleware(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  describe('params validation', () => {
    it('validates params successfully', () => {
      const schema = z.object({ id: z.string().min(1) })
      const req = mockRequest({ params: { id: 'abc-123' } as Record<string, string> })
      const res = mockResponse()
      const middleware = validate({ params: schema })

      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(req.params).toEqual({ id: 'abc-123' })
    })

    it('returns 400 for invalid params', () => {
      const schema = z.object({ id: z.uuid() })
      const req = mockRequest({ params: { id: 'not-a-uuid' } as Record<string, string> })
      const res = mockResponse()
      const middleware = validate({ params: schema })

      middleware(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  describe('query validation', () => {
    it('validates query successfully', () => {
      const schema = z.object({ search: z.string().optional() })
      const req = mockRequest({ query: { search: 'hello' } as Record<string, string> })
      const res = mockResponse()
      const middleware = validate({ query: schema })

      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
    })

    it('returns 400 for invalid query', () => {
      const schema = z.object({ page: z.coerce.number().positive() })
      const req = mockRequest({ query: { page: '-1' } as Record<string, string> })
      const res = mockResponse()
      const middleware = validate({ query: schema })

      middleware(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  describe('combined validation', () => {
    it('validates body, params, and query together', () => {
      const schema = {
        body: z.object({ title: z.string() }),
        params: z.object({ id: z.string() }),
        query: z.object({ format: z.enum(['json', 'xml']).default('json') }),
      }
      const req = mockRequest({
        body: { title: 'Test' },
        params: { id: '123' } as Record<string, string>,
        query: { format: 'json' } as Record<string, string>,
      })
      const res = mockResponse()
      const middleware = validate(schema)

      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(req.body).toEqual({ title: 'Test' })
    })

    it('fails on first invalid part and reports errors', () => {
      const schema = {
        body: z.object({ title: z.string() }),
        params: z.object({ id: z.uuid() }),
      }
      const req = mockRequest({
        body: { title: 123 },
        params: { id: 'ok' } as Record<string, string>,
      })
      const res = mockResponse()
      const middleware = validate(schema)

      middleware(req, res, next)

      expect(next).not.toHaveBeenCalled()
      expect(res.status).toHaveBeenCalledWith(400)
    })
  })

  describe('schema coercion', () => {
    it('coerces and replaces request values with parsed output', () => {
      const schema = {
        query: z.object({
          page: z.coerce.number().default(1),
          count: z.coerce.number().default(10),
        }),
      }
      const req = mockRequest({ query: { page: '3', count: '50' } as Record<string, string> })
      const res = mockResponse()
      const middleware = validate(schema)

      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(req.query).toEqual({ page: 3, count: 50 })
    })

    it('applies default values when fields are missing', () => {
      const schema = {
        query: z.object({
          page: z.coerce.number().default(1),
          limit: z.coerce.number().default(20),
        }),
      }
      const req = mockRequest({ query: {} as Record<string, string> })
      const res = mockResponse()
      const middleware = validate(schema)

      middleware(req, res, next)

      expect(next).toHaveBeenCalled()
      expect(req.query).toEqual({ page: 1, limit: 20 })
    })
  })

  describe('non-Zod errors', () => {
    it('re-throws non-ZodError exceptions', () => {
      const badSchema = {
        parse() {
          throw new Error('unexpected crash')
        },
      }
      const req = mockRequest()
      const res = mockResponse()
      const middleware = validate({ body: badSchema as unknown as z.ZodType })

      expect(() => middleware(req, res, next)).toThrow('unexpected crash')
      expect(next).not.toHaveBeenCalled()
    })
  })
})

describe('validateBody', () => {
  it('creates middleware that validates only the body', () => {
    const schema = z.object({ name: z.string() })
    const req = mockRequest({ body: { name: 'Bob' } })
    const res = mockResponse()
    const next = vi.fn()

    validateBody(schema)(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(req.body).toEqual({ name: 'Bob' })
  })
})

describe('validateParams', () => {
  it('creates middleware that validates only params', () => {
    const schema = z.object({ slug: z.string() })
    const req = mockRequest({ params: { slug: 'hello-world' } as Record<string, string> })
    const res = mockResponse()
    const next = vi.fn()

    validateParams(schema)(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(req.params).toEqual({ slug: 'hello-world' })
  })
})

describe('validateQuery', () => {
  it('creates middleware that validates only query', () => {
    const schema = z.object({ q: z.string().optional() })
    const req = mockRequest({ query: { q: 'search-term' } as Record<string, string> })
    const res = mockResponse()
    const next = vi.fn()

    validateQuery(schema)(req, res, next)

    expect(next).toHaveBeenCalled()
  })
})

describe('paginationSchema', () => {
  it('parses valid pagination params with coercion', () => {
    const result = paginationSchema.parse({ page: '2', perPage: '50' })
    expect(result).toEqual({ page: 2, perPage: 50, order: 'desc' })
  })

  it('applies defaults when no values provided', () => {
    const result = paginationSchema.parse({})
    expect(result).toEqual({ page: 1, perPage: 20, order: 'desc' })
  })

  it('rejects perPage over 100', () => {
    expect(() => paginationSchema.parse({ perPage: '101' })).toThrow()
  })

  it('rejects non-positive page numbers', () => {
    expect(() => paginationSchema.parse({ page: '0' })).toThrow()
    expect(() => paginationSchema.parse({ page: '-1' })).toThrow()
  })

  it('accepts optional sort field', () => {
    const result = paginationSchema.parse({ sort: 'createdAt' })
    expect(result.sort).toBe('createdAt')
  })
})

describe('idParamSchema', () => {
  it('accepts a valid UUID', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000'
    expect(idParamSchema.parse({ id: uuid })).toEqual({ id: uuid })
  })

  it('rejects a non-UUID string', () => {
    expect(() => idParamSchema.parse({ id: 'abc' })).toThrow()
  })
})

describe('searchQuerySchema', () => {
  it('extends pagination with optional search query', () => {
    const result = searchQuerySchema.parse({ q: 'hello', page: '1' })
    expect(result.q).toBe('hello')
    expect(result.page).toBe(1)
    expect(result.perPage).toBe(20)
  })
})

describe('paginated', () => {
  it('wraps data with correct pagination metadata', () => {
    const items = [{ id: 1 }, { id: 2 }]
    const result = paginated(items, 25, 2, 10)

    expect(result).toEqual({
      data: items,
      pagination: {
        page: 2,
        perPage: 10,
        total: 25,
        totalPages: 3,
        hasMore: true,
      },
    })
  })

  it('sets hasMore to false on last page', () => {
    const result = paginated([{ id: 1 }], 5, 3, 2)
    expect(result.pagination.hasMore).toBe(false)
    expect(result.pagination.totalPages).toBe(3)
  })

  it('handles single page of results', () => {
    const result = paginated([{ id: 1 }], 1, 1, 20)
    expect(result.pagination.hasMore).toBe(false)
    expect(result.pagination.totalPages).toBe(1)
  })

  it('handles empty results', () => {
    const result = paginated([], 0, 1, 20)
    expect(result.pagination.total).toBe(0)
    expect(result.pagination.totalPages).toBe(0)
    expect(result.pagination.hasMore).toBe(false)
  })
})

describe('success', () => {
  it('wraps data in a { data } envelope', () => {
    expect(success({ id: 1 })).toEqual({ data: { id: 1 } })
  })

  it('works with arrays', () => {
    expect(success([1, 2, 3])).toEqual({ data: [1, 2, 3] })
  })
})

describe('error', () => {
  it('creates error response with message only', () => {
    expect(error('Something went wrong')).toEqual({ error: 'Something went wrong' })
  })

  it('includes field-level errors when provided', () => {
    const result = error('Validation failed', [
      { field: 'email', message: 'Invalid email' },
    ])
    expect(result).toEqual({
      error: 'Validation failed',
      errors: [{ field: 'email', message: 'Invalid email' }],
    })
  })

  it('omits errors key when not provided', () => {
    const result = error('Not found')
    expect(result).not.toHaveProperty('errors')
  })
})
