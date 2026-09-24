/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written: the DataStore is bonded through the real
 * `setStore`, with only the postgresql driver replaced by an in-memory store.
 *
 * @module
 */
const { fakeStore, tables } = vi.hoisted(() => {
  type Row = Record<string, unknown>
  type Where = { field: string; operator: string; value?: unknown }
  const tables = new Map<string, Map<string, Row>>()
  const primaryKeys = new Map<string, string>()

  /**
   * Returns (creating on first use) an in-test table.
   *
   * @param name - Table name.
   * @returns The table's rows keyed by primary key.
   */
  const table = (name: string): Map<string, Row> => {
    const existing = tables.get(name)
    if (existing) return existing
    const created = new Map<string, Row>()
    tables.set(name, created)
    return created
  }

  /**
   * Evaluates the where-conditions the service issues against a row.
   *
   * @param row - The stored row.
   * @param where - The conditions.
   * @returns Whether every condition holds.
   */
  const matches = (row: Row, where: Where[] = []): boolean =>
    where.every((w) => {
      const v = row[w.field]
      switch (w.operator) {
        case '=':
          return v === w.value
        case '!=':
          return v !== w.value
        case 'in':
          return (w.value as unknown[]).includes(v)
        case 'not_in':
          return !(w.value as unknown[]).includes(v)
        case 'is_null':
          return v === null || v === undefined
        case 'is_not_null':
          return v !== null && v !== undefined
        case '>':
          return String(v) > String(w.value)
        case '<':
          return String(v) < String(w.value)
        case '>=':
          return String(v) >= String(w.value)
        case '<=':
          return String(v) <= String(w.value)
        case 'like':
        case 'ilike':
          return String(v).toLowerCase().includes(String(w.value).replace(/%/g, '').toLowerCase())
        default:
          throw new Error(`fake store: unsupported operator ${w.operator}`)
      }
    })

  const fakeStore = {
    findById: vi.fn(
      async (name: string, id: string | number) => table(name).get(String(id)) ?? null,
    ),
    findOne: vi.fn(
      async (name: string, where: Where[]) =>
        [...table(name).values()].find((row) => matches(row, where)) ?? null,
    ),
    findMany: vi.fn(
      async (
        name: string,
        options: {
          where?: Where[]
          orderBy?: { field: string; direction: 'asc' | 'desc' }[]
          limit?: number
          offset?: number
        } = {},
      ) => {
        let rows = [...table(name).values()].filter((row) => matches(row, options.where))
        for (const order of [...(options.orderBy ?? [])].reverse()) {
          rows = rows.sort((a, b) => {
            const cmp = String(a[order.field]).localeCompare(String(b[order.field]))
            return order.direction === 'desc' ? -cmp : cmp
          })
        }
        const offset = options.offset ?? 0
        return rows.slice(offset, options.limit === undefined ? undefined : offset + options.limit)
      },
    ),
    count: vi.fn(
      async (name: string, where?: Where[]) =>
        [...table(name).values()].filter((row) => matches(row, where)).length,
    ),
    create: vi.fn(async (name: string, data: Row) => {
      const key = primaryKeys.get(name) ?? 'id'
      const now = new Date().toISOString()
      const row: Row = { id: crypto.randomUUID(), createdAt: now, updatedAt: now, ...data }
      table(name).set(String(row[key]), row)
      return { data: row, affected: 1 }
    }),
    updateById: vi.fn(async (name: string, id: string | number, data: Row) => {
      const current = table(name).get(String(id))
      if (!current) return { data: null, affected: 0 }
      const row = { ...current, ...data }
      table(name).set(String(id), row)
      return { data: row, affected: 1 }
    }),
    updateMany: vi.fn(async (name: string, where: Where[], data: Row) => {
      let affected = 0
      for (const [id, row] of table(name)) {
        if (!matches(row, where)) continue
        table(name).set(id, { ...row, ...data })
        affected += 1
      }
      return { data: null, affected }
    }),
    deleteById: vi.fn(async (name: string, id: string | number) => ({
      data: null,
      affected: table(name).delete(String(id)) ? 1 : 0,
    })),
    deleteMany: vi.fn(async (name: string, where: Where[]) => {
      let affected = 0
      for (const [id, row] of table(name)) {
        if (!matches(row, where)) continue
        table(name).delete(id)
        affected += 1
      }
      return { data: null, affected }
    }),
  }
  return { fakeStore, tables, primaryKeys }
})

vi.mock('@molecule/api-database-postgresql', () => ({ store: fakeStore }))

import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import {
  mountDefaultUserAuthRoutes,
  mountDefaultUserCrudRoutes,
  setupJwtJsonwebtoken,
  setupPasswordBcrypt,
  setupServiceDevice,
} from '@molecule/api-bonds-default-express'
import { setStore } from '@molecule/api-database'
import { store } from '@molecule/api-database-postgresql'
import { createRequestHandler } from '@molecule/api-resource'

import { authorization, createRequestHandlerMap } from '../index.js'

vi.hoisted(async () => {
  const { generateKeyPairSync } = await import('node:crypto')
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })
  process.env.JWT_PRIVATE_KEY = privateKey
  process.env.JWT_PUBLIC_KEY = publicKey
})

setStore(store)
setupServiceDevice()
setupJwtJsonwebtoken()
setupPasswordBcrypt()

const User = createRequestHandlerMap(createRequestHandler)
const router = express.Router()
router.use(authorization.verifyMiddleware())
mountDefaultUserAuthRoutes(router, User)
mountDefaultUserCrudRoutes(router, User)

const app = express()
app.use(express.json())
app.use(router)

let baseUrl = ''
let server: Server

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => resolve())
  })
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  )
})

/**
 * Sends a JSON request to the test server.
 *
 * @param method - HTTP method.
 * @param path - Request path.
 * @param body - Optional JSON body.
 * @param token - Optional bearer token.
 * @returns The response status and parsed JSON body.
 */
async function call(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<{ status: number; json: Record<string, unknown> }> {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (token) headers.authorization = `Bearer ${token}`
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return { status: response.status, json: (await response.json()) as Record<string, unknown> }
}

describe('README @example', () => {
  it('signs up, logs in and restores the session with the bearer token', async () => {
    const signup = await call('POST', '/users', {
      username: 'ada',
      email: 'ada@example.com',
      password: 'correct horse',
    })
    expect(signup.status).toBe(201)
    expect(signup.json.user).toMatchObject({ username: 'ada', email: 'ada@example.com' })
    expect(JSON.stringify(signup.json)).not.toContain('passwordHash')

    const login = await call('POST', '/users/log-in', {
      email: 'ada@example.com',
      password: 'correct horse',
    })
    expect(login.status).toBe(200)
    const accessToken = String(login.json.accessToken)

    const me = await call('GET', '/users/me', undefined, accessToken)
    expect(me.status).toBe(200)
    expect(me.json.props).toMatchObject({ username: 'ada' })

    const wrong = await call('POST', '/users/log-in', {
      email: 'ada@example.com',
      password: 'wrong password',
    })
    expect(wrong.status).toBeGreaterThanOrEqual(400)
    expect(tables.get('usersSecrets')?.size).toBe(1)
  })
})
