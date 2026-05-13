const { mockCreate, mockFindById, mockFindMany, mockUpdateById, mockBroadcast } = vi.hoisted(
  () => ({
    mockCreate: vi.fn(),
    mockFindById: vi.fn(),
    mockFindMany: vi.fn(),
    mockUpdateById: vi.fn(),
    mockBroadcast: vi.fn(),
  }),
)

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  findById: mockFindById,
  findMany: mockFindMany,
  updateById: mockUpdateById,
}))

vi.mock('@molecule/api-realtime', () => ({
  broadcast: mockBroadcast,
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createFirmwareForOwner,
  createRolloutForOwner,
  getFirmwareForOwner,
  isUuid,
  listFirmwareForOwner,
  listRolloutsForOwner,
  publishFirmwareForOwner,
  recordRolloutDeviceStatus,
  updateFirmwareForOwner,
} from '../service.js'
import type { FirmwareRolloutRow, FirmwareUpdateTaskRow, FirmwareVersionRow } from '../types.js'

const FW_UUID = '11111111-1111-1111-1111-111111111111'

function makeFirmware(overrides: Partial<FirmwareVersionRow> = {}): FirmwareVersionRow {
  return {
    id: FW_UUID,
    owner_id: 'user-1',
    version: '1.0.0',
    device_type: 'sensor',
    release_notes: '',
    download_url: 'https://x/fw.bin',
    checksum: 'sha256:abc',
    file_size: 1024,
    status: 'published',
    released_at: '2026-05-13T08:00:00.000Z',
    created_at: '2026-05-13T08:00:00.000Z',
    updated_at: '2026-05-13T08:00:00.000Z',
    ...overrides,
  }
}

function makeRollout(overrides: Partial<FirmwareRolloutRow> = {}): FirmwareRolloutRow {
  return {
    id: 'ro-1',
    owner_id: 'user-1',
    firmware_id: FW_UUID,
    fleet_id: null,
    device_ids: '[]',
    strategy: 'immediate',
    status: 'active',
    target_count: 0,
    completed_count: 0,
    failed_count: 0,
    progress_percent: 0,
    created_at: '2026-05-13T08:00:00.000Z',
    updated_at: '2026-05-13T08:00:00.000Z',
    ...overrides,
  }
}

function makeTask(overrides: Partial<FirmwareUpdateTaskRow> = {}): FirmwareUpdateTaskRow {
  return {
    id: 'task-1',
    rollout_id: 'ro-1',
    firmware_id: FW_UUID,
    device_id: 'd-1',
    status: 'pending',
    error_message: null,
    completed_at: null,
    created_at: '2026-05-13T08:00:00.000Z',
    updated_at: '2026-05-13T08:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('isUuid', () => {
  it('accepts canonical UUIDs', () => {
    expect(isUuid(FW_UUID)).toBe(true)
    expect(isUuid('aBcDeF12-3456-7890-abcd-ef1234567890')).toBe(true)
  })

  it('rejects non-UUID strings', () => {
    expect(isUuid('not-a-uuid')).toBe(false)
    expect(isUuid('11111111-1111-1111-1111-11111111111')).toBe(false) // 31 chars at end
    expect(isUuid('')).toBe(false)
  })
})

describe('listFirmwareForOwner', () => {
  it('owner scope + orderBy created_at desc + default limit 50', async () => {
    mockFindMany.mockResolvedValue([])
    await listFirmwareForOwner('user-1')
    const args = mockFindMany.mock.calls[0][1]
    expect(args.where).toEqual([{ field: 'owner_id', operator: '=', value: 'user-1' }])
    expect(args.orderBy).toEqual([{ field: 'created_at', direction: 'desc' }])
    expect(args.limit).toBe(50)
    expect(args.offset).toBe(0)
  })

  it('applies device_type + status filters', async () => {
    mockFindMany.mockResolvedValue([])
    await listFirmwareForOwner('user-1', { device_type: 'sensor', status: 'published' })
    const where = mockFindMany.mock.calls[0][1].where
    expect(where).toContainEqual({ field: 'device_type', operator: '=', value: 'sensor' })
    expect(where).toContainEqual({ field: 'status', operator: '=', value: 'published' })
  })

  it('paginates with offset = (page-1)*limit', async () => {
    mockFindMany.mockResolvedValue([])
    await listFirmwareForOwner('user-1', { page: 3, limit: 10 })
    expect(mockFindMany.mock.calls[0][1].offset).toBe(20)
    expect(mockFindMany.mock.calls[0][1].limit).toBe(10)
  })
})

describe('getFirmwareForOwner IDOR', () => {
  it('null when row missing', async () => {
    mockFindById.mockResolvedValue(null)
    expect(await getFirmwareForOwner('user-1', FW_UUID)).toBeNull()
  })

  it('null when row exists but belongs to another owner', async () => {
    mockFindById.mockResolvedValue(makeFirmware({ owner_id: 'other' }))
    expect(await getFirmwareForOwner('user-1', FW_UUID)).toBeNull()
  })

  it('returns the row for its owner', async () => {
    mockFindById.mockResolvedValue(makeFirmware())
    const out = await getFirmwareForOwner('user-1', FW_UUID)
    expect(out?.id).toBe(FW_UUID)
  })
})

describe('createFirmwareForOwner', () => {
  it('initialises status=draft and released_at=null', async () => {
    mockCreate.mockResolvedValue({ data: makeFirmware({ status: 'draft', released_at: null }) })
    await createFirmwareForOwner('user-1', { version: '1.0.0', device_type: 'sensor' })
    const payload = mockCreate.mock.calls[0][1]
    expect(payload.status).toBe('draft')
    expect(payload.released_at).toBeNull()
    expect(payload.owner_id).toBe('user-1')
  })

  it('defaults release_notes="", download_url=null, checksum=null, file_size=0', async () => {
    mockCreate.mockResolvedValue({ data: makeFirmware() })
    await createFirmwareForOwner('user-1', { version: '1.0.0', device_type: 'sensor' })
    const payload = mockCreate.mock.calls[0][1]
    expect(payload.release_notes).toBe('')
    expect(payload.download_url).toBeNull()
    expect(payload.checksum).toBeNull()
    expect(payload.file_size).toBe(0)
  })
})

describe('updateFirmwareForOwner', () => {
  it('refuses cross-owner update', async () => {
    mockFindById.mockResolvedValue(makeFirmware({ owner_id: 'other' }))
    expect(await updateFirmwareForOwner('user-1', FW_UUID, { version: 'X' })).toBeNull()
    expect(mockUpdateById).not.toHaveBeenCalled()
  })

  it('always stamps updated_at on the patch', async () => {
    mockFindById.mockResolvedValue(makeFirmware())
    mockUpdateById.mockResolvedValue({ data: makeFirmware() })
    await updateFirmwareForOwner('user-1', FW_UUID, { release_notes: 'changelog' })
    const patch = mockUpdateById.mock.calls[0][2]
    expect(patch.release_notes).toBe('changelog')
    expect(patch.updated_at).toBeInstanceOf(Date)
  })
})

describe('publishFirmwareForOwner', () => {
  it('refuses cross-owner publish', async () => {
    mockFindById.mockResolvedValue(makeFirmware({ owner_id: 'other' }))
    expect(await publishFirmwareForOwner('user-1', FW_UUID)).toBeNull()
    expect(mockUpdateById).not.toHaveBeenCalled()
  })

  it('flips status=published and stamps released_at', async () => {
    mockFindById.mockResolvedValue(makeFirmware({ status: 'draft', released_at: null }))
    mockUpdateById.mockResolvedValue({ data: makeFirmware() })
    await publishFirmwareForOwner('user-1', FW_UUID)
    const patch = mockUpdateById.mock.calls[0][2]
    expect(patch.status).toBe('published')
    expect(patch.released_at).toBeInstanceOf(Date)
  })
})

describe('createRolloutForOwner', () => {
  it('rejects non-UUID firmware_id without any DB call', async () => {
    const out = await createRolloutForOwner('user-1', { firmware_id: 'not-a-uuid' })
    expect(out).toEqual({ ok: false, reason: 'not_found' })
    expect(mockFindById).not.toHaveBeenCalled()
  })

  it('rejects missing firmware', async () => {
    mockFindById.mockResolvedValue(null)
    const out = await createRolloutForOwner('user-1', { firmware_id: FW_UUID })
    expect(out).toEqual({ ok: false, reason: 'not_found' })
  })

  it('rejects cross-owner firmware', async () => {
    mockFindById.mockResolvedValue(makeFirmware({ owner_id: 'other' }))
    const out = await createRolloutForOwner('user-1', { firmware_id: FW_UUID })
    expect(out).toEqual({ ok: false, reason: 'not_found' })
  })

  it('rejects unpublished firmware', async () => {
    mockFindById.mockResolvedValue(makeFirmware({ status: 'draft' }))
    const out = await createRolloutForOwner('user-1', {
      firmware_id: FW_UUID,
      device_ids: ['d-1'],
    })
    expect(out).toEqual({ ok: false, reason: 'not_published' })
  })

  it('filters explicit device_ids to only owner-owned devices', async () => {
    mockFindById.mockResolvedValue(makeFirmware())
    // Owned set returns only 'd-1' and 'd-3'; 'd-2' is foreign
    mockFindMany.mockResolvedValueOnce([{ id: 'd-1' }, { id: 'd-3' }])
    mockCreate.mockResolvedValue({ data: makeRollout({ target_count: 2 }) })
    const out = await createRolloutForOwner('user-1', {
      firmware_id: FW_UUID,
      device_ids: ['d-1', 'd-2', 'd-3'],
    })
    expect(out.ok).toBe(true)
    if (out.ok) {
      expect(out.targets).toEqual(['d-1', 'd-3'])
    }
  })

  it('returns no_targets when filtered set is empty', async () => {
    mockFindById.mockResolvedValue(makeFirmware())
    mockFindMany.mockResolvedValueOnce([{ id: 'other-device' }]) // owner doesn't own d-1
    const out = await createRolloutForOwner('user-1', {
      firmware_id: FW_UUID,
      device_ids: ['d-1'],
    })
    expect(out).toEqual({ ok: false, reason: 'no_targets' })
  })

  it('dedups explicit + fleet targets', async () => {
    mockFindById.mockImplementation((table: string) => {
      if (table === 'firmware_versions') return Promise.resolve(makeFirmware())
      if (table === 'fleets') return Promise.resolve({ id: 'flt-1', owner_id: 'user-1' })
      return Promise.resolve(null)
    })
    // Sequence: ownerDeviceIds → [d-1,d-2,d-3]; fleetDeviceIds memberships → [d-2,d-3]
    mockFindMany
      .mockResolvedValueOnce([{ id: 'd-1' }, { id: 'd-2' }, { id: 'd-3' }])
      .mockResolvedValueOnce([{ device_id: 'd-2' }, { device_id: 'd-3' }])
    mockCreate.mockResolvedValue({ data: makeRollout() })
    const out = await createRolloutForOwner('user-1', {
      firmware_id: FW_UUID,
      device_ids: ['d-1', 'd-2'],
      fleet_id: 'flt-1',
    })
    expect(out.ok).toBe(true)
    if (out.ok) {
      expect(out.targets.sort()).toEqual(['d-1', 'd-2', 'd-3'])
    }
  })

  it('ignores fleet owned by another user (no targets from foreign fleet)', async () => {
    mockFindById.mockImplementation((table: string) => {
      if (table === 'firmware_versions') return Promise.resolve(makeFirmware())
      if (table === 'fleets') return Promise.resolve({ id: 'flt-X', owner_id: 'other' })
      return Promise.resolve(null)
    })
    mockFindMany.mockResolvedValueOnce([{ id: 'd-1' }]) // owner has d-1
    mockCreate.mockResolvedValue({ data: makeRollout({ target_count: 1 }) })
    const out = await createRolloutForOwner('user-1', {
      firmware_id: FW_UUID,
      device_ids: ['d-1'],
      fleet_id: 'flt-X',
    })
    expect(out.ok).toBe(true)
    if (out.ok) {
      expect(out.targets).toEqual(['d-1']) // fleet not contributing
    }
  })

  it('creates rollout + tasks + commands and broadcasts per target (default strategy=immediate)', async () => {
    mockFindById.mockResolvedValue(makeFirmware())
    mockFindMany.mockResolvedValueOnce([{ id: 'd-1' }, { id: 'd-2' }])
    mockCreate.mockResolvedValue({ data: makeRollout({ id: 'ro-7', target_count: 2 }) })
    mockBroadcast.mockResolvedValue(undefined)
    const out = await createRolloutForOwner('user-1', {
      firmware_id: FW_UUID,
      device_ids: ['d-1', 'd-2'],
    })
    expect(out.ok).toBe(true)
    if (out.ok) expect(out.targets).toHaveLength(2)
    const tableCalls = mockCreate.mock.calls.map((c) => c[0])
    // 1 rollout + 2 tasks + 2 commands = 5 create() calls
    expect(tableCalls.filter((t) => t === 'firmware_rollouts')).toHaveLength(1)
    expect(tableCalls.filter((t) => t === 'firmware_update_tasks')).toHaveLength(2)
    expect(tableCalls.filter((t) => t === 'device_commands')).toHaveLength(2)
    // Two broadcasts per device (rollout + command channels) = 4
    expect(mockBroadcast).toHaveBeenCalledTimes(4)
    // Rollout payload pinned to provided strategy default
    const rolloutPayload = mockCreate.mock.calls[0][1]
    expect(rolloutPayload.strategy).toBe('immediate')
    expect(rolloutPayload.status).toBe('active')
  })

  it('swallows broadcast failures (best-effort realtime)', async () => {
    mockFindById.mockResolvedValue(makeFirmware())
    mockFindMany.mockResolvedValueOnce([{ id: 'd-1' }])
    mockCreate.mockResolvedValue({ data: makeRollout() })
    mockBroadcast.mockRejectedValue(new Error('realtime down'))
    const out = await createRolloutForOwner('user-1', {
      firmware_id: FW_UUID,
      device_ids: ['d-1'],
    })
    expect(out.ok).toBe(true) // did not throw
  })
})

describe('listRolloutsForOwner', () => {
  it('owner scope + filters + pagination', async () => {
    mockFindMany.mockResolvedValue([])
    await listRolloutsForOwner('user-1', {
      firmware_id: FW_UUID,
      status: 'active',
      page: 2,
      limit: 25,
    })
    const args = mockFindMany.mock.calls[0][1]
    expect(args.where).toContainEqual({ field: 'owner_id', operator: '=', value: 'user-1' })
    expect(args.where).toContainEqual({ field: 'firmware_id', operator: '=', value: FW_UUID })
    expect(args.where).toContainEqual({ field: 'status', operator: '=', value: 'active' })
    expect(args.offset).toBe(25)
    expect(args.limit).toBe(25)
  })
})

describe('recordRolloutDeviceStatus', () => {
  it('returns task_not_found when no matching task', async () => {
    mockFindMany.mockResolvedValue([])
    const out = await recordRolloutDeviceStatus({
      rolloutId: 'ro-1',
      deviceId: 'd-1',
      ownerId: 'user-1',
      status: 'completed',
    })
    expect(out).toEqual({ ok: false, reason: 'task_not_found' })
    expect(mockUpdateById).not.toHaveBeenCalled()
  })

  it('stamps completed_at on completed/failed but not in_progress', async () => {
    mockFindMany.mockResolvedValueOnce([makeTask()]) // task lookup
    mockFindById.mockResolvedValueOnce(makeRollout({ target_count: 1 })) // rollout
    mockFindById.mockResolvedValueOnce(makeFirmware()) // firmware for device update
    await recordRolloutDeviceStatus({
      rolloutId: 'ro-1',
      deviceId: 'd-1',
      ownerId: 'user-1',
      status: 'in_progress',
    })
    // First updateById call is the task patch
    const taskPatch = mockUpdateById.mock.calls[0][2]
    expect(taskPatch.status).toBe('in_progress')
    expect(taskPatch.completed_at).toBeUndefined()
  })

  it('on completed: increments completed_count and flips rollout to completed when done=target', async () => {
    mockFindMany.mockResolvedValueOnce([makeTask()])
    mockFindById
      .mockResolvedValueOnce(makeRollout({ completed_count: 0, failed_count: 0, target_count: 1 }))
      .mockResolvedValueOnce(makeFirmware()) // device firmware bump lookup
    await recordRolloutDeviceStatus({
      rolloutId: 'ro-1',
      deviceId: 'd-1',
      ownerId: 'user-1',
      status: 'completed',
    })
    // 3 updates: task, rollout, device
    expect(mockUpdateById).toHaveBeenCalledTimes(3)
    const rolloutPatch = mockUpdateById.mock.calls[1][2]
    expect(rolloutPatch.completed_count).toBe(1)
    expect(rolloutPatch.failed_count).toBe(0)
    expect(rolloutPatch.progress_percent).toBe(100)
    expect(rolloutPatch.status).toBe('completed')
  })

  it('on failed: increments failed_count and flips rollout to failed when done=target', async () => {
    mockFindMany.mockResolvedValueOnce([makeTask()])
    mockFindById.mockResolvedValueOnce(
      makeRollout({ completed_count: 0, failed_count: 0, target_count: 1 }),
    )
    await recordRolloutDeviceStatus({
      rolloutId: 'ro-1',
      deviceId: 'd-1',
      ownerId: 'user-1',
      status: 'failed',
      errorMessage: 'flash erase failed',
    })
    const rolloutPatch = mockUpdateById.mock.calls[1][2]
    expect(rolloutPatch.failed_count).toBe(1)
    expect(rolloutPatch.status).toBe('failed')
  })

  it('intermediate progress: 1 of 4 → 25%, no terminal status', async () => {
    mockFindMany.mockResolvedValueOnce([makeTask()])
    mockFindById
      .mockResolvedValueOnce(makeRollout({ completed_count: 0, failed_count: 0, target_count: 4 }))
      .mockResolvedValueOnce(makeFirmware())
    await recordRolloutDeviceStatus({
      rolloutId: 'ro-1',
      deviceId: 'd-1',
      ownerId: 'user-1',
      status: 'completed',
    })
    const rolloutPatch = mockUpdateById.mock.calls[1][2]
    expect(rolloutPatch.progress_percent).toBe(25)
    expect(rolloutPatch.status).toBeUndefined() // not yet terminal
  })

  it('does not write rollout patch when caller is not its owner', async () => {
    mockFindMany.mockResolvedValueOnce([makeTask()])
    mockFindById
      .mockResolvedValueOnce(makeRollout({ owner_id: 'other' })) // cross-owner
      .mockResolvedValueOnce(makeFirmware())
    await recordRolloutDeviceStatus({
      rolloutId: 'ro-1',
      deviceId: 'd-1',
      ownerId: 'user-1',
      status: 'completed',
    })
    // Only the task patch + device firmware bump (still happens on success).
    // No rollout updateById call.
    const updatedTables = mockUpdateById.mock.calls.map((c) => c[0])
    expect(updatedTables).toContain('firmware_update_tasks')
    expect(updatedTables).toContain('iot_devices')
    expect(updatedTables).not.toContain('firmware_rollouts')
  })

  it('bumps device.firmware_version to the released version on completed', async () => {
    mockFindMany.mockResolvedValueOnce([makeTask()])
    mockFindById
      .mockResolvedValueOnce(makeRollout({ target_count: 1 }))
      .mockResolvedValueOnce(makeFirmware({ version: '2.5.0' }))
    await recordRolloutDeviceStatus({
      rolloutId: 'ro-1',
      deviceId: 'd-1',
      ownerId: 'user-1',
      status: 'completed',
    })
    // Last updateById is the device bump
    const deviceCall = mockUpdateById.mock.calls.find((c) => c[0] === 'iot_devices')!
    expect(deviceCall[2].firmware_version).toBe('2.5.0')
  })
})
