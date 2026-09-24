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
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { setStore } from '@molecule/api-database'
import { store } from '@molecule/api-database-postgresql'

import { createFeatureFlagRouter, createFlagForUser, updateFlagForUser } from '../index.js'

setStore(store)
const app = express()
app.use(express.json())
// Stand-in for the app's global auth middleware, which sets the session.
app.use((_req, res, next) => {
  res.locals.session = { userId: 'user-123' }
  next()
})
app.use('/flags', createFeatureFlagRouter())

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

const flagRow = {
  id: 'flag-1',
  user_id: 'user-123',
  project_id: null,
  key: 'new-checkout-flow',
  name: 'New checkout flow',
  description: null,
  flag_type: 'boolean',
  default_value: false,
  rollout_percentage: 5,
  is_enabled: false,
  state: 'off',
  environment: 'production',
  stale_days: 30,
  created_at: '2026-09-24T00:00:00.000Z',
  updated_at: '2026-09-24T00:00:00.000Z',
}

describe('README @example', () => {
  it('creates a flag OFF for the session user, then turns it on', async () => {
    fakeStore.create.mockResolvedValueOnce({ data: flagRow, affected: 1 })
    fakeStore.findById
      .mockResolvedValueOnce(flagRow) // ownership check
      .mockResolvedValueOnce({ ...flagRow, is_enabled: true, state: 'on' })
    fakeStore.updateById.mockResolvedValueOnce({ data: null, affected: 1 })

    const userId = 'user-123'
    const flag = await createFlagForUser(userId, {
      key: 'new-checkout-flow',
      name: 'New checkout flow',
      flag_type: 'boolean',
      rollout_percentage: 5,
    })
    expect(fakeStore.create).toHaveBeenCalledWith(
      'feature_flags',
      expect.objectContaining({
        user_id: 'user-123',
        key: 'new-checkout-flow',
        rollout_percentage: 5,
        is_enabled: false,
        state: 'off',
      }),
    )

    const live = await updateFlagForUser(flag.id, userId, { is_enabled: true, state: 'on' })
    expect(fakeStore.updateById).toHaveBeenCalledWith('feature_flags', 'flag-1', {
      is_enabled: true,
      state: 'on',
    })
    expect(live?.state).toBe('on')
  })

  it('serves the same create through the mounted POST /flags route', async () => {
    fakeStore.create.mockResolvedValueOnce({ data: flagRow, affected: 1 })

    const response = await fetch(`${baseUrl}/flags`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: 'new-checkout-flow', name: 'New checkout flow' }),
    })

    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({ id: 'flag-1', state: 'off' })
  })

  it('rejects an invalid flag key with 400', async () => {
    const response = await fetch(`${baseUrl}/flags`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: 'has spaces', name: 'Bad' }),
    })

    expect(response.status).toBe(400)
  })
})
