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
  createActionItem,
  createMeetingForOwner,
  deleteActionItem,
  deleteMeetingForOwner,
  getMeetingForOwner,
  listActionItems,
  listMeetingsForOwner,
  updateActionItem,
  updateMeetingForOwner,
} from '../service.js'
import type { ActionItemRow, MeetingRow } from '../types.js'

function makeMeeting(overrides: Partial<MeetingRow> = {}): MeetingRow {
  return {
    id: 'm-1',
    owner_id: 'user-1',
    title: 'Standup',
    description: null,
    status: 'scheduled',
    scheduled_at: '2026-05-13T10:00:00.000Z',
    started_at: null,
    ended_at: null,
    duration_seconds: 0,
    recording_url: null,
    transcript: null,
    summary: null,
    attendees: [],
    created_at: '2026-05-13T09:00:00.000Z',
    updated_at: '2026-05-13T09:00:00.000Z',
    ...overrides,
  }
}

function makeActionItem(overrides: Partial<ActionItemRow> = {}): ActionItemRow {
  return {
    id: 'ai-1',
    meeting_id: 'm-1',
    description: 'Follow up',
    assignee: null,
    due_date: null,
    is_completed: false,
    source_excerpt: null,
    created_at: '2026-05-13T10:00:00.000Z',
    updated_at: '2026-05-13T10:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('listMeetingsForOwner', () => {
  it('scopes by owner_id', async () => {
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)
    await listMeetingsForOwner('user-1')
    const where = mockFindMany.mock.calls[0][1].where
    expect(where).toEqual([{ field: 'owner_id', operator: '=', value: 'user-1' }])
  })

  it('adds status filter when provided', async () => {
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)
    await listMeetingsForOwner('user-1', { status: 'completed' })
    const where = mockFindMany.mock.calls[0][1].where
    expect(where).toContainEqual({ field: 'status', operator: '=', value: 'completed' })
  })

  it('orders by scheduled_at desc', async () => {
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)
    await listMeetingsForOwner('user-1')
    expect(mockFindMany.mock.calls[0][1].orderBy).toEqual([
      { field: 'scheduled_at', direction: 'desc' },
    ])
  })

  it('paginates with offset = (page - 1) * limit', async () => {
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)
    await listMeetingsForOwner('user-1', { page: 3, limit: 20 })
    expect(mockFindMany.mock.calls[0][1].offset).toBe(40)
    expect(mockFindMany.mock.calls[0][1].limit).toBe(20)
  })
})

describe('getMeetingForOwner — IDOR safety', () => {
  it('returns null for missing row', async () => {
    mockFindById.mockResolvedValue(null)
    expect(await getMeetingForOwner('m-1', 'user-1')).toBeNull()
  })

  it('returns null for cross-owner row', async () => {
    mockFindById.mockResolvedValue(makeMeeting({ owner_id: 'other' }))
    expect(await getMeetingForOwner('m-1', 'user-1')).toBeNull()
  })

  it('returns the row for the rightful owner', async () => {
    mockFindById.mockResolvedValue(makeMeeting())
    const out = await getMeetingForOwner('m-1', 'user-1')
    expect(out?.id).toBe('m-1')
  })
})

describe('createMeetingForOwner', () => {
  it('defaults to scheduled when scheduled_at provided', async () => {
    mockCreate.mockResolvedValue({ data: makeMeeting() })
    await createMeetingForOwner('user-1', {
      title: 'Demo',
      scheduled_at: '2026-05-14T15:00:00.000Z',
    })
    expect(mockCreate.mock.calls[0][1].status).toBe('scheduled')
  })

  it('defaults to completed when no scheduled_at (ad-hoc / past meeting)', async () => {
    mockCreate.mockResolvedValue({ data: makeMeeting({ status: 'completed' }) })
    await createMeetingForOwner('user-1', { title: 'Quick chat' })
    expect(mockCreate.mock.calls[0][1].status).toBe('completed')
  })

  it('initialises duration_seconds = 0 and empty attendees', async () => {
    mockCreate.mockResolvedValue({ data: makeMeeting() })
    await createMeetingForOwner('user-1', { title: 'X' })
    const payload = mockCreate.mock.calls[0][1]
    expect(payload.duration_seconds).toBe(0)
    expect(payload.attendees).toEqual([])
    expect(payload.recording_url).toBeNull()
    expect(payload.transcript).toBeNull()
    expect(payload.summary).toBeNull()
  })

  it('preserves attendees when provided', async () => {
    mockCreate.mockResolvedValue({ data: makeMeeting() })
    await createMeetingForOwner('user-1', {
      title: 'X',
      attendees: [{ name: 'Alice', email: 'a@x.test' }, { name: 'Bob' }],
    })
    expect(mockCreate.mock.calls[0][1].attendees).toHaveLength(2)
  })
})

describe('updateMeetingForOwner', () => {
  it('rejects cross-owner update', async () => {
    mockFindById.mockResolvedValue(makeMeeting({ owner_id: 'other' }))
    expect(await updateMeetingForOwner('m-1', 'user-1', { title: 'X' })).toBeNull()
    expect(mockUpdateById).not.toHaveBeenCalled()
  })

  it('computes duration_seconds when both timestamps now present', async () => {
    mockFindById
      .mockResolvedValueOnce(makeMeeting({ started_at: '2026-05-13T10:00:00.000Z' }))
      .mockResolvedValueOnce(makeMeeting())
    mockUpdateById.mockResolvedValue({ data: {} })
    await updateMeetingForOwner('m-1', 'user-1', {
      ended_at: '2026-05-13T10:30:00.000Z',
    })
    const patch = mockUpdateById.mock.calls[0][2]
    expect(patch.duration_seconds).toBe(1800) // 30 minutes
  })

  it('does NOT compute duration when only one timestamp present', async () => {
    mockFindById
      .mockResolvedValueOnce(makeMeeting()) // no started_at, no ended_at
      .mockResolvedValueOnce(makeMeeting())
    mockUpdateById.mockResolvedValue({ data: {} })
    await updateMeetingForOwner('m-1', 'user-1', {
      started_at: '2026-05-13T10:00:00.000Z',
    })
    const patch = mockUpdateById.mock.calls[0][2]
    expect(patch.duration_seconds).toBeUndefined()
  })

  it('does NOT compute duration when ended_at precedes started_at', async () => {
    mockFindById
      .mockResolvedValueOnce(makeMeeting({ started_at: '2026-05-13T10:30:00.000Z' }))
      .mockResolvedValueOnce(makeMeeting())
    mockUpdateById.mockResolvedValue({ data: {} })
    await updateMeetingForOwner('m-1', 'user-1', {
      ended_at: '2026-05-13T10:00:00.000Z', // before started_at
    })
    const patch = mockUpdateById.mock.calls[0][2]
    expect(patch.duration_seconds).toBeUndefined()
  })
})

describe('deleteMeetingForOwner', () => {
  it('refuses cross-owner delete', async () => {
    mockFindById.mockResolvedValue(makeMeeting({ owner_id: 'other' }))
    expect(await deleteMeetingForOwner('m-1', 'user-1')).toBe(false)
    expect(mockDeleteById).not.toHaveBeenCalled()
  })

  it('deletes for the rightful owner', async () => {
    mockFindById.mockResolvedValue(makeMeeting())
    mockDeleteById.mockResolvedValue({ affected: 1 })
    expect(await deleteMeetingForOwner('m-1', 'user-1')).toBe(true)
  })
})

describe('action items — meeting-scope IDOR', () => {
  it('listActionItems returns null when meeting is missing/cross-owner', async () => {
    mockFindById.mockResolvedValue(makeMeeting({ owner_id: 'other' }))
    expect(await listActionItems('m-1', 'user-1')).toBeNull()
    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it('listActionItems scopes by meeting_id and orders ascending', async () => {
    mockFindById.mockResolvedValue(makeMeeting())
    mockFindMany.mockResolvedValue([makeActionItem()])
    await listActionItems('m-1', 'user-1')
    expect(mockFindMany.mock.calls[0][1].where).toEqual([
      { field: 'meeting_id', operator: '=', value: 'm-1' },
    ])
    expect(mockFindMany.mock.calls[0][1].orderBy).toEqual([
      { field: 'created_at', direction: 'asc' },
    ])
  })

  it('createActionItem returns null when meeting is cross-owner', async () => {
    mockFindById.mockResolvedValue(makeMeeting({ owner_id: 'other' }))
    expect(await createActionItem('m-1', 'user-1', { description: 'TODO' })).toBeNull()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('createActionItem initialises is_completed=false', async () => {
    mockFindById.mockResolvedValue(makeMeeting())
    mockCreate.mockResolvedValue({ data: makeActionItem() })
    await createActionItem('m-1', 'user-1', { description: 'TODO' })
    expect(mockCreate.mock.calls[0][1].is_completed).toBe(false)
  })

  it('updateActionItem refuses item from a different meeting', async () => {
    mockFindById
      .mockResolvedValueOnce(makeMeeting()) // meeting check ok
      .mockResolvedValueOnce(makeActionItem({ meeting_id: 'other-meeting' })) // item from wrong meeting
    expect(await updateActionItem('ai-1', 'm-1', 'user-1', { is_completed: true })).toBeNull()
    expect(mockUpdateById).not.toHaveBeenCalled()
  })

  it('deleteActionItem refuses item from a different meeting', async () => {
    mockFindById
      .mockResolvedValueOnce(makeMeeting()) // meeting check ok
      .mockResolvedValueOnce(makeActionItem({ meeting_id: 'other-meeting' }))
    expect(await deleteActionItem('ai-1', 'm-1', 'user-1')).toBe(false)
    expect(mockDeleteById).not.toHaveBeenCalled()
  })

  it('deleteActionItem succeeds for matching meeting + owner', async () => {
    mockFindById.mockResolvedValueOnce(makeMeeting()).mockResolvedValueOnce(makeActionItem())
    mockDeleteById.mockResolvedValue({ affected: 1 })
    expect(await deleteActionItem('ai-1', 'm-1', 'user-1')).toBe(true)
  })
})
