/**
 * `del` — the user row goes FIRST, so a failed delete leaves the account
 * (and its password hash) intact.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { MoleculeRequest } from '@molecule/api-resource'

const { mockDeleteById, mockGet, mockTrack, mockInvalidateDevices } = vi.hoisted(() => ({
  mockDeleteById: vi.fn(),
  mockGet: vi.fn(),
  mockTrack: vi.fn(async () => {}),
  mockInvalidateDevices: vi.fn(),
}))

vi.mock('@molecule/api-bond', () => ({
  get: mockGet,
  getAnalytics: () => ({ track: mockTrack }),
  getLogger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() }),
}))
vi.mock('@molecule/api-database', () => ({ deleteById: mockDeleteById }))
vi.mock('@molecule/api-i18n', () => ({ t: (key: string) => key }))
vi.mock('../authorization.js', () => ({
  invalidateAllDeviceExistsCache: mockInvalidateDevices,
}))

import { del } from '../handlers/del.js'

const resource = { name: 'User', tableName: 'users', schema: {} } as never
const req = { params: { id: 'u1' } } as unknown as MoleculeRequest

const deleteDevices = vi.fn(async () => {})
const deletePayments = vi.fn(async () => {})

beforeEach(() => {
  vi.clearAllMocks()
  mockGet.mockImplementation((category: string) =>
    category === 'device'
      ? { deleteByUserId: deleteDevices }
      : category === 'paymentRecords'
        ? { deleteByUserId: deletePayments }
        : undefined,
  )
})

describe('del handler', () => {
  it('deletes the user row before the secrets, devices and payment records', async () => {
    mockDeleteById.mockResolvedValue({ affected: 1 })

    const result = await del(resource)(req)

    expect(result).toEqual({ statusCode: 200, body: { props: { id: 'u1' } } })
    expect(mockDeleteById.mock.calls).toEqual([
      ['users', 'u1'],
      ['usersSecrets', 'u1'],
    ])
    const rowDelete = mockDeleteById.mock.invocationCallOrder[0]
    expect(rowDelete).toBeLessThan(mockDeleteById.mock.invocationCallOrder[1])
    expect(rowDelete).toBeLessThan(deleteDevices.mock.invocationCallOrder[0])
    expect(rowDelete).toBeLessThan(deletePayments.mock.invocationCallOrder[0])
    expect(mockInvalidateDevices).toHaveBeenCalledTimes(1)
  })

  it('a failed row delete answers 500 and leaves the secrets, devices and payments alone', async () => {
    mockDeleteById.mockRejectedValue(new Error('db down'))

    const result = await del(resource)(req)

    expect(result.statusCode).toBe(500)
    expect(mockDeleteById).toHaveBeenCalledTimes(1)
    expect(mockDeleteById).toHaveBeenCalledWith('users', 'u1')
    expect(deleteDevices).not.toHaveBeenCalled()
    expect(deletePayments).not.toHaveBeenCalled()
  })

  it('answers 404 without touching anything else when there is no such user', async () => {
    mockDeleteById.mockResolvedValue({ affected: 0 })

    const result = await del(resource)(req)

    expect(result.statusCode).toBe(404)
    expect(mockDeleteById).toHaveBeenCalledTimes(1)
    expect(deleteDevices).not.toHaveBeenCalled()
    expect(deletePayments).not.toHaveBeenCalled()
  })

  it('once the row is gone, a clean-up failure is logged and the delete still succeeds', async () => {
    mockDeleteById.mockImplementation(async (table: string) => {
      if (table === 'usersSecrets') throw new Error('secrets down')
      return { affected: 1 }
    })
    deleteDevices.mockRejectedValueOnce(new Error('devices down'))
    deletePayments.mockRejectedValueOnce(new Error('payments down'))

    const result = await del(resource)(req)

    expect(result.statusCode).toBe(200)
    expect(mockInvalidateDevices).toHaveBeenCalledTimes(1)
    expect(deletePayments).toHaveBeenCalledWith('u1')
  })
})
