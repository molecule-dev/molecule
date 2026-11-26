/**
 * A deleted device is announced to `onRevoked` subscribers, so session authorization drops its
 * cached "exists" answer and refuses the token on its next request.
 *
 * Harness eval, 2026-11-25: after `POST /users/logout` the old cookie still read `GET /users/me`
 * (200), because the user package cached the device for 10 s and nothing told it the row was gone.
 */
const { mockDeleteById, mockDeleteMany } = vi.hoisted(() => ({
  mockDeleteById: vi.fn(),
  mockDeleteMany: vi.fn(),
}))

vi.mock('@molecule/api-database', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  create: vi.fn(),
  deleteById: mockDeleteById,
  deleteMany: mockDeleteMany,
  findById: vi.fn(),
  findMany: vi.fn(),
  findOne: vi.fn(),
  updateById: vi.fn(),
}))

vi.mock('@molecule/api-bond', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getLogger: () => ({ error: vi.fn(), debug: vi.fn() }),
  getAnalytics: () => ({ track: vi.fn().mockResolvedValue(undefined) }),
}))

vi.mock('@molecule/api-i18n', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  t: (key: string) => key,
}))

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { del } from '../handlers/del.js'
import { deviceService } from '../service.js'

const heard: Array<string | null> = []
let unsubscribe: () => void

beforeEach(() => {
  mockDeleteById.mockReset()
  mockDeleteMany.mockReset()
  heard.length = 0
  unsubscribe = deviceService.onRevoked!((deviceId) => heard.push(deviceId))
})
afterEach(() => unsubscribe())

describe('onRevoked', () => {
  it('hears a deleted device by id, and several at once as null (OLD MUSTFAIL)', async () => {
    mockDeleteById.mockResolvedValue({ affected: 1 })
    mockDeleteMany.mockResolvedValue({ affected: 2 })
    await deviceService.delete('d-1')
    await deviceService.deleteByUserId('u-1')
    await deviceService.deleteOthersByUserId!('u-1', 'd-keep')
    expect(heard).toEqual(['d-1', null, null])
  })

  it('hears the DELETE /devices/:id route', async () => {
    mockDeleteById.mockResolvedValue({ affected: 1 })
    const handler = del({ name: 'device', tableName: 'devices' })
    const result = await handler({ params: { id: 'd-2' } } as never)
    expect(result.statusCode).toBe(200)
    expect(heard).toEqual(['d-2'])
  })

  it('counterexample: hears nothing when no row went, the delete failed, or after unsubscribing', async () => {
    mockDeleteById.mockResolvedValue({ affected: 0 })
    const handler = del({ name: 'device', tableName: 'devices' })
    expect((await handler({ params: { id: 'd-none' } } as never)).statusCode).toBe(404)
    mockDeleteById.mockRejectedValue(new Error('db down'))
    await deviceService.delete('d-3')
    expect(heard).toEqual([])
    unsubscribe()
    mockDeleteById.mockResolvedValue({ affected: 1 })
    await deviceService.delete('d-4')
    expect(heard).toEqual([])
  })
})
