/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written: the handlers are mounted on a real Express
 * router with the `authUser` owner check and driven over HTTP. Only the
 * postgresql driver is replaced by an in-test store, and the app's global auth
 * middleware by a session chosen per request.
 *
 * @module
 */
const { fakeStore } = vi.hoisted(() => ({
  fakeStore: {
    findById: vi.fn(),
    findOne: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    updateById: vi.fn(),
    updateMany: vi.fn(),
    deleteById: vi.fn(),
    deleteMany: vi.fn(),
  },
}))

vi.mock('@molecule/api-database-postgresql', () => ({ store: fakeStore }))

import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { setStore, type WhereCondition } from '@molecule/api-database'
import { store } from '@molecule/api-database-postgresql'

import { requestHandlerMap as Project } from '../index.js'

setStore(store)

const router = express.Router()
router.post('/projects', Project.create)
router.get('/projects', Project.list)
router.get('/projects/:id', Project.authUser, Project.read)
router.patch('/projects/:id', Project.authUser, Project.update)
router.delete('/projects/:id', Project.authUser, Project.del)

const app = express()
app.use(express.json())
// Stand-in for the app's global auth middleware: `x-test-user` picks the session user.
app.use((req, res, next) => {
  res.locals.session = { userId: req.header('x-test-user') ?? 'user-123' }
  next()
})
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

/** In-test `projects` rows keyed by id. */
const rows = new Map<string, Record<string, unknown>>()

/**
 * Evaluates the equality conditions the handlers issue against a row.
 *
 * @param row - The stored row.
 * @param where - The conditions.
 * @returns Whether every condition holds.
 */
function matches(row: Record<string, unknown>, where: WhereCondition[] = []): boolean {
  return where.every((w) => row[w.field] === w.value)
}

fakeStore.findOne.mockImplementation(
  async (_table: string, where: WhereCondition[]) =>
    [...rows.values()].find((row) => matches(row, where)) ?? null,
)
fakeStore.findById.mockImplementation(async (_table: string, id: string) => rows.get(id) ?? null)
fakeStore.findMany.mockImplementation(
  async (_table: string, options?: { where?: WhereCondition[] }) =>
    [...rows.values()].filter((row) => matches(row, options?.where)),
)
fakeStore.create.mockImplementation(async (_table: string, data: Record<string, unknown>) => {
  const row = { id: `proj-${rows.size + 1}`, ...data }
  rows.set(row.id, row)
  return { data: row, affected: 1 }
})
fakeStore.updateById.mockImplementation(
  async (_table: string, id: string, data: Record<string, unknown>) => {
    const row = { ...rows.get(id), ...data }
    rows.set(id, row)
    return { data: row, affected: 1 }
  },
)

describe('README @example', () => {
  it('creates, lists and patches the caller’s project; another user gets 403', async () => {
    const created = await fetch(`${baseUrl}/projects`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'My Shop', projectType: 'full-stack' }),
    })
    expect(created.status).toBe(201)
    const project = (await created.json()) as { id: string }
    expect(project).toMatchObject({
      userId: 'user-123',
      slug: 'my-shop',
      projectType: 'full-stack',
      sandboxStatus: 'stopped',
    })

    const list = await fetch(`${baseUrl}/projects`)
    expect(await list.json()).toEqual([expect.objectContaining({ id: project.id })])

    const patched = await fetch(`${baseUrl}/projects/${project.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ settings: { theme: 'dark' }, framework: 'vue' }),
    })
    expect(patched.status).toBe(200)
    const body = (await patched.json()) as { settings: string; framework: unknown }
    expect(JSON.parse(body.settings)).toEqual({ theme: 'dark' })
    expect(body.framework).toBeNull() // ignored by the handler

    const stranger = await fetch(`${baseUrl}/projects/${project.id}`, {
      headers: { 'x-test-user': 'someone-else' },
    })
    expect(stranger.status).toBe(403)
  })
})
