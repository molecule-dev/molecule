const { mockCreate, mockDeleteById, mockFindById, mockFindMany, mockFindOne, mockUpdateById } =
  vi.hoisted(() => ({
    mockCreate: vi.fn(),
    mockDeleteById: vi.fn(),
    mockFindById: vi.fn(),
    mockFindMany: vi.fn(),
    mockFindOne: vi.fn(),
    mockUpdateById: vi.fn(),
  }))

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  deleteById: mockDeleteById,
  findById: mockFindById,
  findMany: mockFindMany,
  findOne: mockFindOne,
  updateById: mockUpdateById,
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createEventTypeForOwner,
  deleteEventTypeForOwner,
  generateSlots,
  getEventTypeBySlug,
  getEventTypeForOwner,
  listEventTypesForOwner,
  setAvailabilityRulesForUser,
  updateEventTypeForOwner,
} from '../service.js'
import type { AvailabilityRuleRow, EventTypeRow } from '../types.js'

function makeRow(overrides: Partial<EventTypeRow> = {}): EventTypeRow {
  return {
    id: 'et-1',
    owner_id: 'user-1',
    name: '30min meeting',
    slug: '30min',
    description: null,
    duration_minutes: 30,
    location_kind: 'video',
    location_value: null,
    buffer_before_minutes: 0,
    buffer_after_minutes: 0,
    min_notice_minutes: 240,
    max_per_day: null,
    requires_confirmation: false,
    color: null,
    is_active: true,
    position: 0,
    created_at: '2026-05-13T10:00:00.000Z',
    updated_at: '2026-05-13T10:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('generateSlots', () => {
  // 2026-05-13 is a Wednesday (day_of_week = 3 UTC)
  const rules: Pick<AvailabilityRuleRow, 'day_of_week' | 'start_minute' | 'end_minute'>[] = [
    { day_of_week: 3, start_minute: 9 * 60, end_minute: 12 * 60 }, // Wed 9–12
    { day_of_week: 4, start_minute: 13 * 60, end_minute: 17 * 60 }, // Thu 1–5
  ]

  it('respects day_of_week — Wed slots use Wed rule only', () => {
    const slots = generateSlots({ date: '2026-05-13', durationMinutes: 30, rules })
    expect(slots).toHaveLength(6) // 3 hours / 30min
    expect(slots[0].start).toMatch(/2026-05-13T09:00:00/)
    expect(slots[5].end).toMatch(/2026-05-13T12:00:00/)
  })

  it('respects day_of_week — Thu slots use Thu rule only', () => {
    const slots = generateSlots({ date: '2026-05-14', durationMinutes: 30, rules })
    expect(slots).toHaveLength(8) // 4 hours / 30min
    expect(slots[0].start).toMatch(/2026-05-14T13:00:00/)
  })

  it('returns empty array for a day with no matching rule (Fri)', () => {
    const slots = generateSlots({ date: '2026-05-15', durationMinutes: 30, rules })
    expect(slots).toEqual([])
  })

  it('accounts for buffer minutes between slots', () => {
    // 30min slot + 15min before-buffer + 15min after-buffer = 60min total cadence
    const slots = generateSlots({
      date: '2026-05-13',
      durationMinutes: 30,
      bufferBeforeMinutes: 15,
      bufferAfterMinutes: 15,
      rules,
    })
    expect(slots).toHaveLength(3) // 3 hour window / 60min cadence
  })

  it('rejects a partial slot at the end of the window', () => {
    // 90min slot in a 3-hour window: 2 slots fit (180/90), no leftover
    const slots = generateSlots({ date: '2026-05-13', durationMinutes: 90, rules })
    expect(slots).toHaveLength(2)
    // 100min slot in 3-hour window: 1 slot fits (100), 80min leftover insufficient
    const slots100 = generateSlots({ date: '2026-05-13', durationMinutes: 100, rules })
    expect(slots100).toHaveLength(1)
  })

  it('marks each slot as available=true (caller filters bookings)', () => {
    const slots = generateSlots({ date: '2026-05-13', durationMinutes: 30, rules })
    for (const s of slots) expect(s.available).toBe(true)
  })
})

describe('getEventTypeForOwner', () => {
  it('null for missing', async () => {
    mockFindById.mockResolvedValue(null)
    expect(await getEventTypeForOwner('et-1', 'user-1')).toBeNull()
  })

  it('null for cross-owner (IDOR safety)', async () => {
    mockFindById.mockResolvedValue(makeRow({ owner_id: 'user-2' }))
    expect(await getEventTypeForOwner('et-1', 'user-1')).toBeNull()
  })

  it('returns row when caller owns', async () => {
    mockFindById.mockResolvedValue(makeRow())
    const row = await getEventTypeForOwner('et-1', 'user-1')
    expect(row?.id).toBe('et-1')
  })
})

describe('getEventTypeBySlug', () => {
  it('looks up by slug + is_active=true', async () => {
    mockFindOne.mockResolvedValue(makeRow())
    await getEventTypeBySlug('30min')
    const where = mockFindOne.mock.calls[0][1]
    expect(where).toContainEqual({ field: 'slug', operator: '=', value: '30min' })
    expect(where).toContainEqual({ field: 'is_active', operator: '=', value: true })
  })

  it('returns null when not found', async () => {
    mockFindOne.mockResolvedValue(null)
    expect(await getEventTypeBySlug('missing')).toBeNull()
  })
})

describe('listEventTypesForOwner', () => {
  it('hides inactive event types by default', async () => {
    mockFindMany.mockResolvedValue([])
    await listEventTypesForOwner('user-1')
    const where = mockFindMany.mock.calls[0][1].where
    expect(where).toContainEqual({ field: 'is_active', operator: '=', value: true })
  })

  it('shows inactive event types when include_inactive: true', async () => {
    mockFindMany.mockResolvedValue([])
    await listEventTypesForOwner('user-1', { include_inactive: true })
    const where = mockFindMany.mock.calls[0][1].where
    expect(where).not.toContainEqual({ field: 'is_active', operator: '=', value: true })
  })
})

describe('createEventTypeForOwner', () => {
  it('stamps owner_id + applies sensible defaults', async () => {
    mockCreate.mockResolvedValue({ data: makeRow() })
    await createEventTypeForOwner('user-1', { name: 'Quick chat', slug: 'quick' })
    const payload = mockCreate.mock.calls[0][1]
    expect(payload.owner_id).toBe('user-1')
    expect(payload.duration_minutes).toBe(30) // default
    expect(payload.location_kind).toBe('video') // default
    expect(payload.buffer_before_minutes).toBe(0) // default
    expect(payload.min_notice_minutes).toBe(240) // default
    expect(payload.requires_confirmation).toBe(false) // default
    expect(payload.is_active).toBe(true) // default
  })
})

describe('updateEventTypeForOwner', () => {
  it('refuses cross-owner', async () => {
    mockFindById.mockResolvedValue(makeRow({ owner_id: 'user-2' }))
    expect(await updateEventTypeForOwner('et-1', 'user-1', { name: 'x' })).toBeNull()
    expect(mockUpdateById).not.toHaveBeenCalled()
  })
})

describe('deleteEventTypeForOwner', () => {
  it('refuses cross-owner', async () => {
    mockFindById.mockResolvedValue(makeRow({ owner_id: 'user-2' }))
    expect(await deleteEventTypeForOwner('et-1', 'user-1')).toBe(false)
    expect(mockDeleteById).not.toHaveBeenCalled()
  })

  it('deletes when caller owns', async () => {
    mockFindById.mockResolvedValue(makeRow({ owner_id: 'user-1' }))
    mockDeleteById.mockResolvedValue({ affected: 1 })
    expect(await deleteEventTypeForOwner('et-1', 'user-1')).toBe(true)
  })
})

describe('setAvailabilityRulesForUser', () => {
  it('replaces existing rules atomically (delete-then-insert)', async () => {
    mockFindMany.mockResolvedValueOnce([
      { id: 'old-1', user_id: 'user-1', day_of_week: 1, start_minute: 0, end_minute: 60 },
    ])
    mockDeleteById.mockResolvedValue({ affected: 1 })
    mockCreate.mockResolvedValue({ data: {} })
    mockFindMany.mockResolvedValueOnce([])
    await setAvailabilityRulesForUser('user-1', [
      { day_of_week: 2, start_minute: 600, end_minute: 720, timezone: 'UTC' },
    ])
    expect(mockDeleteById).toHaveBeenCalledWith('availability_rules', 'old-1')
    expect(mockCreate.mock.calls[0][1].user_id).toBe('user-1')
  })
})
