const {
  mockCreate,
  mockDeleteById,
  mockDeleteMany,
  mockFindById,
  mockFindMany,
  mockFindOne,
  mockUpdateById,
  mockGetLogger,
  mockGetAnalytics,
  mockTrack,
  mockLoggerError,
} = vi.hoisted(() => {
  const loggerError = vi.fn()
  const track = vi.fn().mockResolvedValue(undefined)
  return {
    mockCreate: vi.fn(),
    mockDeleteById: vi.fn(),
    mockDeleteMany: vi.fn(),
    mockFindById: vi.fn(),
    mockFindMany: vi.fn(),
    mockFindOne: vi.fn(),
    mockUpdateById: vi.fn(),
    mockGetLogger: vi.fn().mockReturnValue({ error: loggerError }),
    mockGetAnalytics: vi.fn().mockReturnValue({ track }),
    mockTrack: track,
    mockLoggerError: loggerError,
  }
})

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  deleteById: mockDeleteById,
  deleteMany: mockDeleteMany,
  findById: mockFindById,
  findMany: mockFindMany,
  findOne: mockFindOne,
  updateById: mockUpdateById,
}))

vi.mock('@molecule/api-bond', () => ({
  getLogger: mockGetLogger,
  getAnalytics: mockGetAnalytics,
}))

vi.mock('uuid', () => ({
  v4: () => 'fixed-uuid-v4',
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { deviceService } from '../service.js'

beforeEach(() => {
  // clearAllMocks (not reset) — preserves the getLogger/getAnalytics
  // mockReturnValue defaults applied in vi.hoisted above. The service
  // module captured logger + analytics at import time, so wiping their
  // implementations between tests would break it.
  mockCreate.mockReset()
  mockDeleteById.mockReset()
  mockDeleteMany.mockReset()
  mockFindById.mockReset()
  mockFindMany.mockReset()
  mockFindOne.mockReset()
  mockUpdateById.mockReset()
  mockTrack.mockClear()
  mockTrack.mockResolvedValue(undefined)
  mockLoggerError.mockClear()
})

describe('createOrUpdate', () => {
  it('updates updatedAt when device with same name already exists for user', async () => {
    mockFindOne.mockResolvedValue({ id: 'existing-id' })
    mockUpdateById.mockResolvedValue({ data: {} })
    const out = await deviceService.createOrUpdate('user-1', 'iPhone 15')
    expect(out).toBe('existing-id')
    expect(mockUpdateById).toHaveBeenCalledWith('devices', 'existing-id', {
      updatedAt: expect.any(String),
    })
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('creates a new device + tracks analytics when none exists', async () => {
    mockFindOne.mockResolvedValue(null)
    mockCreate.mockResolvedValue({ data: {} })
    const out = await deviceService.createOrUpdate('user-1', 'iPhone 15')
    expect(out).toBe('fixed-uuid-v4')
    expect(mockCreate).toHaveBeenCalledWith(
      'devices',
      expect.objectContaining({
        id: 'fixed-uuid-v4',
        userId: 'user-1',
        name: 'iPhone 15',
      }),
    )
    expect(mockTrack).toHaveBeenCalledWith({
      name: 'device.registered',
      userId: 'user-1',
      properties: { deviceId: 'fixed-uuid-v4' },
    })
  })

  it('scopes existence check by userId + name', async () => {
    mockFindOne.mockResolvedValue(null)
    mockCreate.mockResolvedValue({ data: {} })
    await deviceService.createOrUpdate('user-X', 'Pixel')
    expect(mockFindOne.mock.calls[0][1]).toEqual([
      { field: 'userId', operator: '=', value: 'user-X' },
      { field: 'name', operator: '=', value: 'Pixel' },
    ])
  })

  it('swallows analytics rejection (best-effort telemetry)', async () => {
    mockFindOne.mockResolvedValue(null)
    mockCreate.mockResolvedValue({ data: {} })
    mockTrack.mockRejectedValue(new Error('analytics down'))
    const out = await deviceService.createOrUpdate('user-1', 'iPhone')
    expect(out).toBe('fixed-uuid-v4') // not null — analytics failure doesn't break create
  })

  it('returns null + logs error when DB throws', async () => {
    mockFindOne.mockRejectedValue(new Error('db down'))
    const out = await deviceService.createOrUpdate('user-1', 'iPhone')
    expect(out).toBeNull()
    expect(mockLoggerError).toHaveBeenCalled()
  })
})

describe('updateLastSeen', () => {
  it('updates updatedAt for the device id', async () => {
    mockUpdateById.mockResolvedValue({ data: {} })
    await deviceService.updateLastSeen('dev-1')
    expect(mockUpdateById).toHaveBeenCalledWith('devices', 'dev-1', {
      updatedAt: expect.any(String),
    })
  })

  it('swallows DB errors (logs only)', async () => {
    mockUpdateById.mockRejectedValue(new Error('db down'))
    await expect(deviceService.updateLastSeen('dev-1')).resolves.toBeUndefined()
    expect(mockLoggerError).toHaveBeenCalled()
  })
})

describe('deleteByUserId', () => {
  it('issues deleteMany scoped to userId', async () => {
    mockDeleteMany.mockResolvedValue({ affected: 3 })
    await deviceService.deleteByUserId('user-1')
    expect(mockDeleteMany).toHaveBeenCalledWith('devices', [
      { field: 'userId', operator: '=', value: 'user-1' },
    ])
  })

  it('swallows DB errors (logs only)', async () => {
    mockDeleteMany.mockRejectedValue(new Error('db down'))
    await expect(deviceService.deleteByUserId('user-1')).resolves.toBeUndefined()
    expect(mockLoggerError).toHaveBeenCalled()
  })
})

describe('exists', () => {
  it('returns true when the device row is found', async () => {
    mockFindById.mockResolvedValue({ id: 'dev-1' })
    await expect(deviceService.exists('dev-1')).resolves.toBe(true)
    expect(mockFindById).toHaveBeenCalledWith('devices', 'dev-1')
  })

  it('returns false when the device row is gone (revoked/logged out)', async () => {
    mockFindById.mockResolvedValue(null)
    await expect(deviceService.exists('dev-1')).resolves.toBe(false)
  })

  it('re-throws on DB failure so the caller can fail-open on infra errors', async () => {
    mockFindById.mockRejectedValue(new Error('db down'))
    await expect(deviceService.exists('dev-1')).rejects.toThrow('db down')
  })
})

describe('delete', () => {
  it('issues deleteById for the device id', async () => {
    mockDeleteById.mockResolvedValue({ affected: 1 })
    await deviceService.delete('dev-1')
    expect(mockDeleteById).toHaveBeenCalledWith('devices', 'dev-1')
  })

  it('swallows DB errors (logs only)', async () => {
    mockDeleteById.mockRejectedValue(new Error('db down'))
    await expect(deviceService.delete('dev-1')).resolves.toBeUndefined()
    expect(mockLoggerError).toHaveBeenCalled()
  })
})

describe('getWithPushSubscription', () => {
  it('queries devices scoped to user with hasPushSubscription=true', async () => {
    mockFindMany.mockResolvedValue([
      { id: 'd-1', pushPlatform: 'web', pushSubscription: { endpoint: 'x' } },
    ])
    const out = await deviceService.getWithPushSubscription('user-1')
    expect(out).toHaveLength(1)
    expect(mockFindMany.mock.calls[0][1].where).toEqual([
      { field: 'userId', operator: '=', value: 'user-1' },
      { field: 'hasPushSubscription', operator: '=', value: true },
    ])
  })

  it('returns [] + logs error when DB throws', async () => {
    mockFindMany.mockRejectedValue(new Error('db down'))
    const out = await deviceService.getWithPushSubscription('user-1')
    expect(out).toEqual([])
    expect(mockLoggerError).toHaveBeenCalled()
  })
})
