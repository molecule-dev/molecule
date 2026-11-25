/**
 * The route helpers resource packages use in their own routes: the session's user id, the 401
 * without one, a route parameter as a string, and the `:id` schema. Eleven resources imported
 * them from the app's Express bond bundle, which made every app that added one of those resources
 * install the 45 providers that bundle wires.
 *
 * @module
 */

import { describe, expect, it, vi } from 'vitest'

import type { MoleculeRequest, MoleculeResponse } from '../http-types.js'
import { getParamId, getUserId, idParamSchema, requireUser } from '../route-helpers.js'

vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values: unknown, options?: { defaultValue?: string }) =>
    options?.defaultValue ?? '',
}))

/** A response with the given locals that records its status and JSON body. */
function response(locals: Record<string, unknown> = {}): MoleculeResponse & {
  sent: { status?: number; body?: unknown }
} {
  const sent: { status?: number; body?: unknown } = {}
  const res = {
    sent,
    locals,
    status(code: number) {
      sent.status = code
      return res
    },
    json(body: unknown) {
      sent.body = body
    },
  }
  return res as unknown as MoleculeResponse & { sent: typeof sent }
}

const request = (params: Record<string, unknown>): MoleculeRequest =>
  ({ params, body: {}, query: {}, headers: {} }) as MoleculeRequest

describe('getUserId', () => {
  it('reads the session the auth middleware set', () => {
    expect(getUserId(response({ session: { userId: 'u1' } }))).toBe('u1')
  })

  it('gives null without a session', () => {
    expect(getUserId(response())).toBeNull()
    expect(getUserId(response({ session: {} }))).toBeNull()
  })
})

describe('requireUser', () => {
  it('gives the user id and sends nothing when signed in', () => {
    const res = response({ session: { userId: 'u1' } })
    expect(requireUser(res)).toBe('u1')
    expect(res.sent).toEqual({})
  })

  it('answers 401 and gives null without a session', () => {
    const res = response()
    expect(requireUser(res)).toBeNull()
    expect(res.sent).toEqual({ status: 401, body: { error: 'Unauthorized.' } })
  })
})

describe('getParamId', () => {
  it('reads the id parameter, and another by name', () => {
    expect(getParamId(request({ id: 'a' }))).toBe('a')
    expect(getParamId(request({ slug: 'b' }), 'slug')).toBe('b')
  })

  it('takes the first value of a repeated parameter', () => {
    expect(getParamId(request({ id: ['a', 'b'] }))).toBe('a')
  })
})

describe('idParamSchema', () => {
  it('accepts any non-empty id, not only a UUID', () => {
    expect(idParamSchema.parse({ id: 'task-1' })).toEqual({ id: 'task-1' })
    expect(() => idParamSchema.parse({ id: '' })).toThrow()
  })
})
