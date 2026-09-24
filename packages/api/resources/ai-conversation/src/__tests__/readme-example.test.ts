/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written: the handlers are mounted on a real Express
 * router and driven over HTTP. Only the postgresql driver and the Anthropic network
 * provider are replaced by in-test fakes, and the app's global auth middleware by a fixed session.
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

const { fakeAI } = vi.hoisted(() => ({
  fakeAI: {
    name: 'anthropic',
    chat: vi.fn(async function* () {
      yield { type: 'text' as const, content: 'Toggle added.' }
    }),
  },
}))

vi.mock('@molecule/api-database-postgresql', () => ({ store: fakeStore }))
vi.mock('@molecule/api-ai-anthropic', () => ({ createProvider: () => fakeAI }))

import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import express from 'express'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { setProvider } from '@molecule/api-ai'
import { createProvider } from '@molecule/api-ai-anthropic'
import { setStore } from '@molecule/api-database'
import { store } from '@molecule/api-database-postgresql'

import { requestHandlerMap as Conversation } from '../index.js'

setStore(store)

setProvider('anthropic', createProvider({ apiKey: process.env.ANTHROPIC_API_KEY }))

const router = express.Router()
router.post('/projects/:projectId/chat', Conversation.authUser, Conversation.chat)
router.get('/projects/:projectId/chat', Conversation.authUser, Conversation.history)
router.delete('/projects/:projectId/chat', Conversation.authUser, Conversation.clear)

const app = express()
app.use(express.json())
// Stand-in for the app's global auth middleware, which sets the session.
app.use((_req, res, next) => {
  res.locals.session = { userId: 'user-123' }
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

describe('README @example', () => {
  it('POST /projects/:projectId/chat streams the bonded provider reply over SSE and saves both turns', async () => {
    const project = { id: 'proj-1', userId: 'user-123' }
    fakeStore.findOne
      .mockResolvedValueOnce(project) // authUser ownership check
      .mockResolvedValueOnce(project) // handler's defense-in-depth re-check
      .mockResolvedValueOnce(null) // no conversation yet
    // Like postgres, the created row comes back with its JSONB columns parsed.
    fakeStore.create.mockImplementationOnce(
      async (_table: string, data: { projectId: string; messages: string }) => ({
        data: { id: 'conv-1', projectId: data.projectId, messages: JSON.parse(data.messages) },
        affected: 1,
      }),
    )
    fakeStore.updateById.mockResolvedValueOnce({ data: null, affected: 1 })

    const response = await fetch(`${baseUrl}/projects/proj-1/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'Add a dark mode toggle' }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/event-stream')
    const body = await response.text()
    expect(body).toContain('data: {"type":"conversation","id":"conv-1"}')
    expect(body).toContain('data: {"type":"text","content":"Toggle added."}')
    expect(body).toContain('data: {"type":"done"}')
    expect(fakeAI.chat).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [{ role: 'user', content: 'Add a dark mode toggle' }],
        stream: true,
      }),
    )
    expect(fakeStore.updateById).toHaveBeenCalledWith(
      'conversations',
      'conv-1',
      expect.objectContaining({ messages: expect.stringContaining('Toggle added.') }),
    )
  })

  it('answers 403 when the session user does not own the project', async () => {
    fakeStore.findOne.mockResolvedValueOnce(null)

    const response = await fetch(`${baseUrl}/projects/someone-else/chat`)

    expect(response.status).toBe(403)
  })
})
