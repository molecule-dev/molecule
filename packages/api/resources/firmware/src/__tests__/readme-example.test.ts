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

import { findById, setStore } from '@molecule/api-database'
import { store } from '@molecule/api-database-postgresql'
import { issueToken, verifyToken } from '@molecule/api-resource-device-auth-token'

import {
  createFirmwareForOwner,
  createFirmwareRouter,
  type DeviceTokenMiddleware,
  publishFirmwareForOwner,
} from '../index.js'

setStore(store)
const app = express()
app.use(express.json())
// Stand-in for the app's global auth middleware, which sets the session.
app.use((_req, res, next) => {
  res.locals.session = { userId: 'user-123' }
  next()
})
const requireDeviceToken: DeviceTokenMiddleware = async (req, res, next) => {
  const token = await verifyToken((req.header('authorization') ?? '').replace(/^Bearer /, ''))
  const device = token ? await findById<{ owner_id: string }>('iot_devices', token.device_id) : null
  if (!token || !device) {
    res.sendStatus(401)
    return
  }
  res.locals.deviceAuth = { deviceId: token.device_id, ownerId: device.owner_id }
  next()
}
app.use('/api/firmware', createFirmwareRouter({ requireDeviceToken }))

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

const draftRow = {
  id: 'fw-1',
  owner_id: 'user-123',
  version: '2.4.0',
  device_type: 'thermostat',
  release_notes: '',
  download_url: null,
  checksum: null,
  file_size: 0,
  status: 'draft',
  released_at: null,
  created_at: '2026-09-24T00:00:00.000Z',
  updated_at: '2026-09-24T00:00:00.000Z',
}

describe('README @example', () => {
  it('creates a draft firmware for the owner and publishes it', async () => {
    fakeStore.create.mockResolvedValueOnce({ data: draftRow, affected: 1 })
    fakeStore.findById.mockResolvedValueOnce(draftRow)
    fakeStore.updateById.mockResolvedValueOnce({
      data: { ...draftRow, status: 'published' },
      affected: 1,
    })

    const ownerId = 'user-123'
    const draft = await createFirmwareForOwner(ownerId, {
      version: '2.4.0',
      device_type: 'thermostat',
    })
    expect(fakeStore.create).toHaveBeenCalledWith(
      'firmware_versions',
      expect.objectContaining({ owner_id: 'user-123', version: '2.4.0', status: 'draft' }),
    )
    const released = draft ? await publishFirmwareForOwner(ownerId, draft.id) : null
    expect(released?.status).toBe('published')
  })

  it('rejects a device status report without a valid device token', async () => {
    fakeStore.findOne.mockResolvedValueOnce(null) // verifyToken: unknown token

    const response = await fetch(`${baseUrl}/api/firmware/rollouts/r-1/devices/d-1/status`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer dvt_bogus' },
      body: JSON.stringify({ status: 'completed' }),
    })

    expect(response.status).toBe(401)
  })

  it('records a status report from a device holding a valid device token', async () => {
    let tokenRow: Record<string, unknown> | null = null
    fakeStore.create.mockImplementationOnce(
      async (_table: string, data: Record<string, unknown>) => {
        tokenRow = { id: 'tok-1', created_at: new Date(), ...data }
        return { data: tokenRow, affected: 1 }
      },
    )
    const { plaintext } = await issueToken({ device_id: 'd-1' })

    fakeStore.findOne.mockResolvedValueOnce(tokenRow) // verifyToken
    fakeStore.findById
      .mockResolvedValueOnce({ id: 'd-1', owner_id: 'user-123' }) // iot_devices
      .mockResolvedValueOnce(null) // rollout (counters skipped)
      .mockResolvedValueOnce(null) // firmware lookup
    fakeStore.findMany.mockResolvedValueOnce([
      { id: 'task-1', rollout_id: 'r-1', device_id: 'd-1', firmware_id: 'fw-1' },
    ])
    fakeStore.updateById.mockResolvedValue({ data: null, affected: 1 })

    const response = await fetch(`${baseUrl}/api/firmware/rollouts/r-1/devices/d-1/status`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${plaintext}` },
      body: JSON.stringify({ status: 'completed' }),
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(fakeStore.updateById).toHaveBeenCalledWith(
      'firmware_update_tasks',
      'task-1',
      expect.objectContaining({ status: 'completed' }),
    )
  })
})
