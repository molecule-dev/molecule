/**
 * Comprehensive tests for `@molecule/api-openapi`.
 *
 * Covers:
 * - `defineOpenApi` builds valid 3.1.0 docs and rejects invalid input.
 * - `routeToOperation` converts paths, params, query, body, responses.
 * - zod-to-JSON-Schema round-trips for the common schema kinds.
 * - `validateRequest` passes valid input and reports zod-driven issues.
 * - JSON-Schema fallback validator handles handcrafted schemas + `$ref`.
 * - `createOpenApiHandler` serves docs as JSON, handles HEAD/405.
 *
 * @module
 */

import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import {
  addRouteToDoc,
  annotateOperation,
  createOpenApiHandler,
  defineOpenApi,
  resolveRef,
  routeToOperation,
  validateRequest,
  zodToJsonSchema,
} from '../index.js'
import type { OpenApiHandlerResponse, RouteDefinition } from '../types.js'

describe('defineOpenApi', () => {
  it('produces a 3.1.0 doc with sensible defaults', () => {
    const doc = defineOpenApi({ info: { title: 'API', version: '1.0.0' } })
    expect(doc.openapi).toBe('3.1.0')
    expect(doc.info).toEqual({ title: 'API', version: '1.0.0' })
    expect(doc.paths).toEqual({})
    expect(doc.components.schemas).toEqual({})
    expect(doc.components.securitySchemes).toEqual({})
  })

  it('preserves servers, security, components, and tags', () => {
    const doc = defineOpenApi({
      info: { title: 'API', version: '1.0.0' },
      servers: [{ url: 'https://api.example.com' }],
      security: [{ bearer: [] }],
      tags: [{ name: 'users', description: 'User ops' }],
      components: {
        schemas: { User: { type: 'object', properties: { id: { type: 'string' } } } },
        securitySchemes: { bearer: { type: 'http', scheme: 'bearer' } },
      },
    })
    expect(doc.servers?.[0]?.url).toBe('https://api.example.com')
    expect(doc.security).toEqual([{ bearer: [] }])
    expect(doc.tags?.[0]?.name).toBe('users')
    expect(doc.components.schemas?.User).toBeDefined()
    expect(doc.components.securitySchemes?.bearer).toEqual({ type: 'http', scheme: 'bearer' })
  })

  it('normalizes Express-style paths into OpenAPI form', () => {
    const doc = defineOpenApi({
      info: { title: 'A', version: '1' },
      paths: { '/users/:id': { get: { responses: { '200': { description: 'OK' } } } } },
    })
    expect(Object.keys(doc.paths)).toEqual(['/users/{id}'])
  })

  it('throws when info.title or info.version is missing', () => {
    expect(() => defineOpenApi({ info: { title: '', version: '1.0' } })).toThrow(/title/)
    expect(() => defineOpenApi({ info: { title: 'X', version: '' } })).toThrow(/version/)
  })
})

describe('zodToJsonSchema', () => {
  it('converts primitives', () => {
    expect(zodToJsonSchema(z.string())).toMatchObject({ type: 'string' })
    expect(zodToJsonSchema(z.number())).toMatchObject({ type: 'number' })
    expect(zodToJsonSchema(z.boolean())).toMatchObject({ type: 'boolean' })
  })

  it('strips the JSON-Schema dialect tag from the result', () => {
    const json = zodToJsonSchema(z.object({ a: z.string() }))
    expect(json).not.toHaveProperty('$schema')
  })

  it('converts objects with required + optional fields', () => {
    const schema = z.object({ id: z.string().uuid(), nick: z.string().optional() })
    const json = zodToJsonSchema(schema)
    expect(json.type).toBe('object')
    expect(Object.keys(json.properties ?? {})).toEqual(['id', 'nick'])
    expect(json.required).toEqual(['id'])
    expect(json.properties?.id?.format).toBe('uuid')
  })

  it('converts arrays + enums + unions', () => {
    expect(zodToJsonSchema(z.array(z.number()))).toMatchObject({
      type: 'array',
      items: { type: 'number' },
    })
    expect(zodToJsonSchema(z.enum(['a', 'b', 'c']))).toMatchObject({ enum: ['a', 'b', 'c'] })
    const union = zodToJsonSchema(z.union([z.string(), z.number()]))
    expect(union.anyOf?.length).toBe(2)
  })

  it('passes through pre-built JSON Schemas unchanged', () => {
    const handcrafted = { type: 'object' as const, properties: { x: { type: 'string' as const } } }
    expect(zodToJsonSchema(handcrafted)).toBe(handcrafted)
  })

  it('round-trips through OpenAPI doc components without losing data', () => {
    const userSchema = z.object({ id: z.string(), email: z.string().email() })
    const json = zodToJsonSchema(userSchema)
    const doc = defineOpenApi({
      info: { title: 'A', version: '1' },
      components: { schemas: { User: json } },
    })
    expect(doc.components.schemas?.User?.type).toBe('object')
    expect(doc.components.schemas?.User?.properties?.email?.format).toBe('email')
  })
})

describe('routeToOperation', () => {
  it('builds operation with summary + tags + responses', () => {
    const op = routeToOperation({
      method: 'get',
      path: '/health',
      summary: 'Health check',
      tags: ['system'],
    })
    expect(op.summary).toBe('Health check')
    expect(op.tags).toEqual(['system'])
    expect(op.responses['200']?.description).toBe('OK')
  })

  it('emits path / query / header parameters from object schemas', () => {
    const op = routeToOperation({
      method: 'get',
      path: '/users/{id}',
      request: {
        params: z.object({ id: z.string().uuid() }),
        query: z.object({ include: z.string().optional() }),
        headers: z.object({ 'x-trace': z.string() }),
      },
    })
    const params = op.parameters ?? []
    expect(params.find((p) => p.in === 'path' && p.name === 'id')?.required).toBe(true)
    const include = params.find((p) => p.in === 'query' && p.name === 'include')
    expect(include?.required).toBe(false)
    expect(params.find((p) => p.in === 'header' && p.name === 'x-trace')?.required).toBe(true)
  })

  it('emits a requestBody for POST routes with a body schema', () => {
    const op = routeToOperation({
      method: 'post',
      path: '/users',
      request: {
        body: z.object({ email: z.string().email() }),
        bodyDescription: 'New user',
      },
    })
    expect(op.requestBody?.required).toBe(true)
    expect(op.requestBody?.description).toBe('New user')
    expect(op.requestBody?.content['application/json']?.schema.type).toBe('object')
  })

  it('builds a default 200 response when no response map is supplied', () => {
    const op = routeToOperation({ method: 'get', path: '/x' })
    expect(op.responses).toEqual({ '200': { description: 'OK' } })
  })

  it('honors custom response descriptions and content types', () => {
    const op = routeToOperation({
      method: 'get',
      path: '/csv',
      response: {
        '200': { description: 'CSV', body: { type: 'string' }, contentType: 'text/csv' },
        '404': { description: 'Not found' },
      },
    })
    expect(op.responses['200']?.content?.['text/csv']?.schema.type).toBe('string')
    expect(op.responses['404']?.description).toBe('Not found')
    expect(op.responses['404']?.content).toBeUndefined()
  })

  it('round-trips through addRouteToDoc on the OpenAPI document', () => {
    const doc = defineOpenApi({ info: { title: 'A', version: '1' } })
    const route: RouteDefinition = { method: 'get', path: '/users/:id' }
    addRouteToDoc(doc, route, routeToOperation(route))
    expect(Object.keys(doc.paths)).toEqual(['/users/{id}'])
    expect(doc.paths['/users/{id}']?.get).toBeDefined()
  })
})

describe('validateRequest (zod-backed)', () => {
  const route: RouteDefinition = {
    method: 'post',
    path: '/users/{id}',
    request: {
      params: z.object({ id: z.string().uuid() }),
      query: z.object({ verbose: z.string().optional() }),
      body: z.object({ email: z.string().email(), age: z.number().int().min(0).max(120) }),
    },
  }
  const op = annotateOperation(route, routeToOperation(route))

  it('accepts a valid payload and returns parsed data', () => {
    const result = validateRequest(op, {
      params: { id: '550e8400-e29b-41d4-a716-446655440000' },
      query: {},
      body: { email: 'ada@example.com', age: 30 },
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.body).toEqual({ email: 'ada@example.com', age: 30 })
    }
  })

  it('reports zod issues with full path + message + code', () => {
    const result = validateRequest(op, {
      params: { id: 'not-a-uuid' },
      body: { email: 'nope', age: 200 },
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paramIssue = result.errors.find((e) => e.in === 'params')
      expect(paramIssue?.path).toBe('id')
      const emailIssue = result.errors.find((e) => e.in === 'body' && e.path === 'email')
      expect(emailIssue?.code).toBeDefined()
      const ageIssue = result.errors.find((e) => e.in === 'body' && e.path === 'age')
      expect(ageIssue).toBeDefined()
    }
  })
})

describe('validateRequest (JSON-Schema fallback)', () => {
  it('validates handcrafted JSON Schemas embedded as parameters', () => {
    const op = routeToOperation({
      method: 'get',
      path: '/things/{id}',
      request: {
        params: {
          type: 'object',
          properties: { id: { type: 'string', minLength: 3 } },
          required: ['id'],
        },
      },
    })
    const ok = validateRequest(op, { params: { id: 'abcd' } })
    expect(ok.success).toBe(true)
    const bad = validateRequest(op, { params: { id: 'a' } })
    expect(bad.success).toBe(false)
    if (!bad.success) {
      expect(bad.errors[0]?.in).toBe('params')
      expect(bad.errors[0]?.code).toBe('too_small')
    }
  })

  it('resolves $refs when a root document is supplied', () => {
    const doc = defineOpenApi({
      info: { title: 'A', version: '1' },
      components: {
        schemas: {
          UserId: { type: 'string', pattern: '^u_[0-9]+$' },
        },
      },
    })
    const route: RouteDefinition = {
      method: 'get',
      path: '/users/{id}',
      request: {
        params: {
          type: 'object',
          properties: { id: { $ref: '#/components/schemas/UserId' } },
          required: ['id'],
        },
      },
    }
    const op = annotateOperation(route, routeToOperation(route), doc)
    const good = validateRequest(op, { params: { id: 'u_42' } })
    expect(good.success).toBe(true)
    const bad = validateRequest(op, { params: { id: 'nope' } })
    expect(bad.success).toBe(false)
  })

  it('flags missing required body fields and unexpected props', () => {
    const route: RouteDefinition = {
      method: 'post',
      path: '/x',
      request: {
        body: {
          type: 'object',
          properties: { a: { type: 'string' }, b: { type: 'number' } },
          required: ['a', 'b'],
          additionalProperties: false,
        },
      },
    }
    const op = annotateOperation(route, routeToOperation(route))
    const result = validateRequest(op, { body: { a: 'hi', extra: 1 } })
    expect(result.success).toBe(false)
    if (!result.success) {
      const codes = result.errors.map((e) => e.code)
      expect(codes).toContain('invalid_type')
      expect(codes).toContain('unrecognized_keys')
    }
  })

  it('exposes resolveRef as a public utility', () => {
    const root = { components: { schemas: { X: { type: 'string' } } } }
    expect(resolveRef(root, '#/components/schemas/X')).toEqual({ type: 'string' })
    expect(resolveRef(root, '#/components/schemas/Missing')).toBeUndefined()
    expect(resolveRef(root, 'http://external')).toBeUndefined()
  })
})

describe('createOpenApiHandler', () => {
  const doc = defineOpenApi({ info: { title: 'API', version: '1.0.0' } })

  it('serves the doc as JSON on GET', () => {
    const handler = createOpenApiHandler(doc)
    const setHeader = vi.fn()
    const status = vi.fn().mockReturnThis()
    const json = vi.fn()
    const res: OpenApiHandlerResponse = { setHeader, status, json }
    handler({ method: 'GET' }, res)
    expect(setHeader).toHaveBeenCalledWith(
      'Content-Type',
      expect.stringMatching(/application\/json/),
    )
    expect(status).toHaveBeenCalledWith(200)
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ openapi: '3.1.0' }))
  })

  it('returns 405 for non-GET methods with an Allow header', () => {
    const handler = createOpenApiHandler(doc)
    const setHeader = vi.fn()
    const status = vi.fn().mockReturnThis()
    const send = vi.fn()
    handler({ method: 'POST' }, { setHeader, status, send })
    expect(status).toHaveBeenCalledWith(405)
    expect(setHeader).toHaveBeenCalledWith('Allow', 'GET, HEAD')
    expect(send).toHaveBeenCalled()
  })

  it('falls back to res.send / res.end when res.json is missing', () => {
    const handler = createOpenApiHandler(doc, { pretty: true })
    const setHeader = vi.fn()
    const status = vi.fn().mockReturnThis()
    const send = vi.fn()
    handler({ method: 'GET' }, { setHeader, status, send })
    const body = send.mock.calls[0]?.[0] as string
    expect(body).toContain('"openapi": "3.1.0"')
  })

  it('produces empty body for HEAD requests', () => {
    const handler = createOpenApiHandler(doc)
    const setHeader = vi.fn()
    const status = vi.fn().mockReturnThis()
    const send = vi.fn()
    handler({ method: 'HEAD' }, { setHeader, status, send })
    expect(send).toHaveBeenCalledWith('')
  })
})
