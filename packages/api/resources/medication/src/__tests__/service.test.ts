const { mockCount, mockCreate, mockDeleteById, mockFindById, mockFindMany, mockUpdateById } =
  vi.hoisted(() => ({
    mockCount: vi.fn(),
    mockCreate: vi.fn(),
    mockDeleteById: vi.fn(),
    mockFindById: vi.fn(),
    mockFindMany: vi.fn(),
    mockUpdateById: vi.fn(),
  }))

vi.mock('@molecule/api-database', () => ({
  count: mockCount,
  create: mockCreate,
  deleteById: mockDeleteById,
  findById: mockFindById,
  findMany: mockFindMany,
  updateById: mockUpdateById,
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  adherenceRate,
  createMedicationForOwner,
  deleteMedicationForOwner,
  getMedicationForOwner,
  listLogs,
  listMedicationsForOwner,
  logDose,
  updateMedicationForOwner,
} from '../service.js'
import type { MedicationLogRow, MedicationRow } from '../types.js'

function makeMed(overrides: Partial<MedicationRow> = {}): MedicationRow {
  return {
    id: 'med-1',
    owner_id: 'user-1',
    name: 'Lisinopril',
    generic_name: null,
    dosage: '10mg',
    unit: null,
    frequency: 'daily',
    times_of_day: ['08:00'],
    start_date: null,
    end_date: null,
    notes: null,
    is_active: true,
    created_at: '2026-05-13T08:00:00.000Z',
    updated_at: '2026-05-13T08:00:00.000Z',
    ...overrides,
  }
}

function makeLog(overrides: Partial<MedicationLogRow> = {}): MedicationLogRow {
  return {
    id: 'log-1',
    medication_id: 'med-1',
    owner_id: 'user-1',
    taken_at: '2026-05-13T08:00:00.000Z',
    status: 'taken',
    notes: null,
    created_at: '2026-05-13T08:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('listMedicationsForOwner', () => {
  it('default scope: owner + is_active=true only', async () => {
    mockFindMany.mockResolvedValue([])
    await listMedicationsForOwner('user-1')
    const where = mockFindMany.mock.calls[0][1].where
    expect(where).toContainEqual({ field: 'owner_id', operator: '=', value: 'user-1' })
    expect(where).toContainEqual({ field: 'is_active', operator: '=', value: true })
  })

  it('include_inactive=true drops the is_active filter', async () => {
    mockFindMany.mockResolvedValue([])
    await listMedicationsForOwner('user-1', { include_inactive: true })
    const where = mockFindMany.mock.calls[0][1].where
    expect(where).not.toContainEqual({ field: 'is_active', operator: '=', value: true })
  })

  it('orders alphabetically by name', async () => {
    mockFindMany.mockResolvedValue([])
    await listMedicationsForOwner('user-1')
    expect(mockFindMany.mock.calls[0][1].orderBy).toEqual([{ field: 'name', direction: 'asc' }])
  })
})

describe('getMedicationForOwner — IDOR', () => {
  it('returns null for missing row', async () => {
    mockFindById.mockResolvedValue(null)
    expect(await getMedicationForOwner('med-1', 'user-1')).toBeNull()
  })

  it('returns null for cross-owner row', async () => {
    mockFindById.mockResolvedValue(makeMed({ owner_id: 'other' }))
    expect(await getMedicationForOwner('med-1', 'user-1')).toBeNull()
  })

  it('returns the row for the rightful owner', async () => {
    mockFindById.mockResolvedValue(makeMed())
    const out = await getMedicationForOwner('med-1', 'user-1')
    expect(out?.id).toBe('med-1')
  })
})

describe('createMedicationForOwner', () => {
  it('initialises is_active=true', async () => {
    mockCreate.mockResolvedValue({ data: makeMed() })
    await createMedicationForOwner('user-1', { name: 'X', dosage: '5mg' })
    expect(mockCreate.mock.calls[0][1].is_active).toBe(true)
  })

  it('defaults frequency to daily and times_of_day to []', async () => {
    mockCreate.mockResolvedValue({ data: makeMed() })
    await createMedicationForOwner('user-1', { name: 'X', dosage: '5mg' })
    const payload = mockCreate.mock.calls[0][1]
    expect(payload.frequency).toBe('daily')
    expect(payload.times_of_day).toEqual([])
  })

  it('preserves frequency + times_of_day when provided', async () => {
    mockCreate.mockResolvedValue({ data: makeMed() })
    await createMedicationForOwner('user-1', {
      name: 'X',
      dosage: '5mg',
      frequency: 'twice_daily',
      times_of_day: ['08:00', '20:00'],
    })
    const payload = mockCreate.mock.calls[0][1]
    expect(payload.frequency).toBe('twice_daily')
    expect(payload.times_of_day).toEqual(['08:00', '20:00'])
  })

  it('defaults optional fields to null', async () => {
    mockCreate.mockResolvedValue({ data: makeMed() })
    await createMedicationForOwner('user-1', { name: 'X', dosage: '5mg' })
    const payload = mockCreate.mock.calls[0][1]
    expect(payload.generic_name).toBeNull()
    expect(payload.unit).toBeNull()
    expect(payload.start_date).toBeNull()
    expect(payload.end_date).toBeNull()
    expect(payload.notes).toBeNull()
  })
})

describe('updateMedicationForOwner', () => {
  it('refuses cross-owner update', async () => {
    mockFindById.mockResolvedValue(makeMed({ owner_id: 'other' }))
    expect(await updateMedicationForOwner('med-1', 'user-1', { dosage: 'X' })).toBeNull()
    expect(mockUpdateById).not.toHaveBeenCalled()
  })

  it('returns refreshed row after update', async () => {
    mockFindById.mockResolvedValueOnce(makeMed()).mockResolvedValueOnce(makeMed({ dosage: '20mg' }))
    mockUpdateById.mockResolvedValue({ data: {} })
    const out = await updateMedicationForOwner('med-1', 'user-1', { dosage: '20mg' })
    expect(out?.dosage).toBe('20mg')
  })
})

describe('deleteMedicationForOwner', () => {
  it('refuses cross-owner delete', async () => {
    mockFindById.mockResolvedValue(makeMed({ owner_id: 'other' }))
    expect(await deleteMedicationForOwner('med-1', 'user-1')).toBe(false)
    expect(mockDeleteById).not.toHaveBeenCalled()
  })

  it('deletes for the rightful owner', async () => {
    mockFindById.mockResolvedValue(makeMed())
    mockDeleteById.mockResolvedValue({ affected: 1 })
    expect(await deleteMedicationForOwner('med-1', 'user-1')).toBe(true)
  })
})

describe('logDose', () => {
  it('returns null when medication is cross-owner', async () => {
    mockFindById.mockResolvedValue(makeMed({ owner_id: 'other' }))
    expect(await logDose('med-1', 'user-1', {})).toBeNull()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('defaults status to "taken" when omitted', async () => {
    mockFindById.mockResolvedValue(makeMed())
    mockCreate.mockResolvedValue({ data: makeLog() })
    await logDose('med-1', 'user-1', {})
    expect(mockCreate.mock.calls[0][1].status).toBe('taken')
  })

  it('preserves explicit status (skipped/late/missed)', async () => {
    mockFindById.mockResolvedValue(makeMed())
    mockCreate.mockResolvedValue({ data: makeLog() })
    await logDose('med-1', 'user-1', { status: 'skipped' })
    expect(mockCreate.mock.calls[0][1].status).toBe('skipped')
  })

  it('defaults taken_at to now() when omitted', async () => {
    mockFindById.mockResolvedValue(makeMed())
    mockCreate.mockResolvedValue({ data: makeLog() })
    const before = Date.now()
    await logDose('med-1', 'user-1', {})
    const after = Date.now()
    const stamped = Date.parse(mockCreate.mock.calls[0][1].taken_at)
    expect(stamped).toBeGreaterThanOrEqual(before)
    expect(stamped).toBeLessThanOrEqual(after)
  })
})

describe('listLogs', () => {
  it('returns null when medication is missing/cross-owner', async () => {
    mockFindById.mockResolvedValue(makeMed({ owner_id: 'other' }))
    expect(await listLogs('med-1', 'user-1')).toBeNull()
    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it('scopes by medication_id AND owner_id (defence-in-depth)', async () => {
    mockFindById.mockResolvedValue(makeMed())
    mockFindMany.mockResolvedValue([])
    await listLogs('med-1', 'user-1')
    const where = mockFindMany.mock.calls[0][1].where
    expect(where).toContainEqual({ field: 'medication_id', operator: '=', value: 'med-1' })
    expect(where).toContainEqual({ field: 'owner_id', operator: '=', value: 'user-1' })
  })

  it('applies from/to window when provided', async () => {
    mockFindById.mockResolvedValue(makeMed())
    mockFindMany.mockResolvedValue([])
    await listLogs('med-1', 'user-1', {
      from: '2026-05-01T00:00:00.000Z',
      to: '2026-05-13T23:59:59.999Z',
    })
    const where = mockFindMany.mock.calls[0][1].where
    expect(where).toContainEqual({
      field: 'taken_at',
      operator: '>=',
      value: '2026-05-01T00:00:00.000Z',
    })
    expect(where).toContainEqual({
      field: 'taken_at',
      operator: '<=',
      value: '2026-05-13T23:59:59.999Z',
    })
  })

  it('orders by taken_at desc and defaults limit to 200', async () => {
    mockFindById.mockResolvedValue(makeMed())
    mockFindMany.mockResolvedValue([])
    await listLogs('med-1', 'user-1')
    const args = mockFindMany.mock.calls[0][1]
    expect(args.orderBy).toEqual([{ field: 'taken_at', direction: 'desc' }])
    expect(args.limit).toBe(200)
  })
})

describe('adherenceRate', () => {
  it('rate = taken / total when total > 0', async () => {
    mockCount.mockResolvedValueOnce(10).mockResolvedValueOnce(7) // total then taken
    const out = await adherenceRate('user-1', 'from', 'to')
    expect(out).toEqual({ taken: 7, total: 10, rate: 0.7 })
  })

  it('rate = 0 when total = 0 (avoid divide-by-zero)', async () => {
    mockCount.mockResolvedValue(0)
    const out = await adherenceRate('user-1', 'from', 'to')
    expect(out).toEqual({ taken: 0, total: 0, rate: 0 })
  })

  it('first count is unrestricted; second count adds status=taken filter', async () => {
    mockCount.mockResolvedValueOnce(10).mockResolvedValueOnce(7)
    await adherenceRate('user-1', '2026-05-01', '2026-05-13')
    const firstWhere = mockCount.mock.calls[0][1]
    const secondWhere = mockCount.mock.calls[1][1]
    expect(firstWhere).not.toContainEqual(expect.objectContaining({ field: 'status' }))
    expect(secondWhere).toContainEqual({ field: 'status', operator: '=', value: 'taken' })
  })
})
