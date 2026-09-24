/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written: the router is mounted on a real Express app and
 * driven over HTTP. Only the postgresql driver is replaced by an in-test store,
 * and the global auth middleware by a fixed session.
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
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { setStore } from '@molecule/api-database'
import { store } from '@molecule/api-database-postgresql'

import { createForumThreadRouter, createReply, createThread } from '../index.js'

setStore(store)
const app = express()
app.use(express.json())
// Stand-in for the app's global auth middleware, which sets the session.
let sessionUserId = 'user-123'
app.use((_req, res, next) => {
  res.locals.session = { userId: sessionUserId }
  next()
})
const moderatorIds = new Set(['user-admin'])
app.use(
  '/threads',
  createForumThreadRouter({ isModeratorFor: (userId) => moderatorIds.has(userId) }),
)

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

const threadRow = {
  id: 'thread-1',
  author_id: 'user-123',
  category_id: null,
  title: 'Welcome thread',
  body: 'Say hi!',
  slug: 'welcome-thread',
  status: 'open',
  is_pinned: false,
  vote_score: 0,
  reply_count: 0,
  view_count: 0,
  last_activity_at: '2026-09-24T00:00:00.000Z',
  created_at: '2026-09-24T00:00:00.000Z',
  updated_at: '2026-09-24T00:00:00.000Z',
}

describe('README @example', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a thread with a title slug and a reply that bumps reply_count', async () => {
    fakeStore.create
      .mockResolvedValueOnce({ data: threadRow, affected: 1 })
      .mockResolvedValueOnce({ data: { id: 'reply-1', thread_id: 'thread-1' }, affected: 1 })
    fakeStore.findById.mockResolvedValueOnce(threadRow)
    fakeStore.updateById.mockResolvedValueOnce({ data: null, affected: 1 })

    const thread = await createThread('user-123', { title: 'Welcome thread', body: 'Say hi!' })
    expect(fakeStore.create).toHaveBeenNthCalledWith(
      1,
      'forum_threads',
      expect.objectContaining({ author_id: 'user-123', slug: 'welcome-thread', status: 'open' }),
    )
    const reply = await createReply(thread.id, 'user-456', { body: 'Hi everyone' })
    expect(reply?.id).toBe('reply-1')
    expect(fakeStore.updateById).toHaveBeenCalledWith(
      'forum_threads',
      'thread-1',
      expect.objectContaining({ reply_count: 1 }),
    )
  })

  it('refuses a reply to a locked thread through the mounted route', async () => {
    fakeStore.findById.mockResolvedValueOnce({ ...threadRow, status: 'locked' })

    const response = await fetch(`${baseUrl}/threads/thread-1/replies`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ body: 'Too late' }),
    })

    expect(response.status).toBe(400)
    expect(fakeStore.create).not.toHaveBeenCalledWith('forum_replies', expect.anything())
  })

  it('denies pinning to a non-moderator and allows it for a moderator', async () => {
    fakeStore.findById.mockResolvedValueOnce(threadRow)
    const denied = await fetch(`${baseUrl}/threads/thread-1`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ is_pinned: true }),
    })
    expect(denied.status).not.toBe(200)
    expect(fakeStore.updateById).not.toHaveBeenCalledWith('forum_threads', 'thread-1', {
      is_pinned: true,
    })

    sessionUserId = 'user-admin'
    fakeStore.findById
      .mockResolvedValueOnce(threadRow)
      .mockResolvedValueOnce({ ...threadRow, is_pinned: true })
    fakeStore.updateById.mockResolvedValueOnce({ data: null, affected: 1 })
    const allowed = await fetch(`${baseUrl}/threads/thread-1`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ is_pinned: true }),
    })
    expect(allowed.status).toBe(200)
    expect(await allowed.json()).toMatchObject({ is_pinned: true })
  })
})
