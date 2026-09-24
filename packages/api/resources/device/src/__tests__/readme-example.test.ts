/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works as written: the handlers are mounted on a real Express
 * router and driven over HTTP. Only the postgresql driver is replaced by an
 * in-test DataStore, and the app's global auth middleware by a fixed session.
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

import { mountDefaultDeviceRoutes } from '@molecule/api-bonds-default-express'
import { setStore } from '@molecule/api-database'
import { store } from '@molecule/api-database-postgresql'
import { createRequestHandler } from '@molecule/api-resource'

import { createRequestHandlerMap, deviceService } from '../index.js'

setStore(store)

const Device = createRequestHandlerMap(createRequestHandler)
const router = express.Router()
mountDefaultDeviceRoutes(router, Device)

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
  it('registers a device, then serves it to its owner through the mounted routes', async () => {
    fakeStore.findOne.mockResolvedValueOnce(null) // no device with that name yet
    fakeStore.create.mockResolvedValueOnce({ data: null, affected: 1 })

    const deviceId = await deviceService.createOrUpdate('user-123', 'Chrome on macOS')
    expect(typeof deviceId).toBe('string')
    expect(fakeStore.create).toHaveBeenCalledWith(
      'devices',
      expect.objectContaining({ id: deviceId, userId: 'user-123', name: 'Chrome on macOS' }),
    )

    const row = { id: deviceId, userId: 'user-123', name: 'Chrome on macOS' }
    fakeStore.findOne.mockResolvedValueOnce(row) // authUser: owned by the session user

    const response = await fetch(`${baseUrl}/devices/${deviceId}`)

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ props: row })
    expect(fakeStore.findOne).toHaveBeenLastCalledWith('devices', [
      { field: 'id', operator: '=', value: deviceId },
      { field: 'userId', operator: '=', value: 'user-123' },
    ])
  })
})
