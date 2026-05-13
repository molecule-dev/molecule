const { mockCreate, mockDeleteById, mockFindById, mockFindMany, mockUpdateById } = vi.hoisted(
  () => ({
    mockCreate: vi.fn(),
    mockDeleteById: vi.fn(),
    mockFindById: vi.fn(),
    mockFindMany: vi.fn(),
    mockUpdateById: vi.fn(),
  }),
)

vi.mock('@molecule/api-database', () => ({
  create: mockCreate,
  deleteById: mockDeleteById,
  findById: mockFindById,
  findMany: mockFindMany,
  updateById: mockUpdateById,
}))

import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createTaskForOwner,
  deleteTaskForOwner,
  getTaskForOwner,
  listTasksForOwner,
  reorderTasksForOwner,
  toTask,
  updateTaskForOwner,
} from '../service.js'
import type { TaskRow } from '../types.js'

function makeRow(overrides: Partial<TaskRow> = {}): TaskRow {
  return {
    id: 't1',
    owner_id: 'user-1',
    title: 'Buy groceries',
    description: null,
    priority: 3,
    due_date: null,
    due_time: null,
    parent_id: null,
    project_id: null,
    recurrence_rule: null,
    position: 0,
    is_completed: false,
    completed_at: null,
    created_at: '2026-05-13T10:00:00.000Z',
    updated_at: '2026-05-13T10:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('toTask', () => {
  it('normalises a DB row into the public Task shape', () => {
    const row = makeRow({
      priority: 2,
      due_date: '2026-05-14',
      is_completed: true,
      completed_at: '2026-05-13T11:00:00.000Z',
    })
    const t = toTask(row)
    expect(t.id).toBe('t1')
    expect(t.title).toBe('Buy groceries')
    expect(t.priority).toBe(2)
    expect(t.due_date).toBe('2026-05-14')
    expect(t.completed).toBe(true)
    expect(t.completed_at).toBe('2026-05-13T11:00:00.000Z')
  })

  it('clamps priority outside 1-4 to 4', () => {
    expect(toTask(makeRow({ priority: 0 })).priority).toBe(4)
    expect(toTask(makeRow({ priority: 9 })).priority).toBe(4)
    expect(toTask(makeRow({ priority: null as unknown as number })).priority).toBe(4)
  })

  it('renders due_date Date instances as YYYY-MM-DD without TZ shift', () => {
    // A Date with explicit local components on 2026-05-14 (any TZ).
    const d = new Date(2026, 4, 14, 0, 0, 0)
    expect(toTask(makeRow({ due_date: d })).due_date).toBe('2026-05-14')
  })

  it('parses recurring shorthand from rule strings', () => {
    expect(toTask(makeRow({ recurrence_rule: 'every 1 day' })).recurring).toBe('daily')
    expect(toTask(makeRow({ recurrence_rule: 'every 1 week' })).recurring).toBe('weekly')
    expect(toTask(makeRow({ recurrence_rule: 'every 2 months' })).recurring).toBe('monthly')
    expect(toTask(makeRow({ recurrence_rule: 'every 3 years' })).recurring).toBe('yearly')
    expect(toTask(makeRow({ recurrence_rule: 'not parseable' })).recurring).toBe(null)
    expect(toTask(makeRow({ recurrence_rule: null })).recurring).toBe(null)
  })
})

describe('listTasksForOwner', () => {
  it('always scopes by owner_id', async () => {
    mockFindMany.mockResolvedValue([])
    await listTasksForOwner('user-1')
    const opts = mockFindMany.mock.calls[0][1]
    expect(opts.where).toContainEqual({ field: 'owner_id', operator: '=', value: 'user-1' })
  })

  it('passes through parent_id filter when provided', async () => {
    mockFindMany.mockResolvedValue([])
    await listTasksForOwner('user-1', { parent_id: 'parent-1' })
    expect(mockFindMany.mock.calls[0][1].where).toContainEqual({
      field: 'parent_id',
      operator: '=',
      value: 'parent-1',
    })
  })

  it('treats parent_id: null as is_null operator', async () => {
    mockFindMany.mockResolvedValue([])
    await listTasksForOwner('user-1', { parent_id: null })
    expect(mockFindMany.mock.calls[0][1].where).toContainEqual({
      field: 'parent_id',
      operator: 'is_null',
    })
  })

  it("filter=today narrows to today's incomplete tasks", async () => {
    mockFindMany.mockResolvedValue([])
    await listTasksForOwner('user-1', { filter: 'today' })
    const where = mockFindMany.mock.calls[0][1].where
    const today = new Date().toISOString().slice(0, 10)
    expect(where).toContainEqual({ field: 'due_date', operator: '=', value: today })
    expect(where).toContainEqual({ field: 'is_completed', operator: '=', value: false })
  })
})

describe('getTaskForOwner', () => {
  it('returns null for a non-existent id', async () => {
    mockFindById.mockResolvedValue(null)
    expect(await getTaskForOwner('missing', 'user-1')).toBeNull()
  })

  it('returns null when the row belongs to another owner (IDOR safety)', async () => {
    mockFindById.mockResolvedValue(makeRow({ owner_id: 'user-2' }))
    expect(await getTaskForOwner('t1', 'user-1')).toBeNull()
  })

  it('returns the shaped Task when caller owns it', async () => {
    mockFindById.mockResolvedValue(makeRow({ title: 'Mine' }))
    const t = await getTaskForOwner('t1', 'user-1')
    expect(t?.title).toBe('Mine')
  })
})

describe('createTaskForOwner', () => {
  it('persists owner_id + defaults priority + completed=false', async () => {
    mockCreate.mockResolvedValue({ data: makeRow() })
    await createTaskForOwner('user-1', { title: 'Task' })
    const payload = mockCreate.mock.calls[0][1]
    expect(payload.owner_id).toBe('user-1')
    expect(payload.is_completed).toBe(false)
    expect(payload.completed_at).toBeNull()
    expect(payload.priority).toBe(4) // defaulted when unprovided
  })
})

describe('updateTaskForOwner', () => {
  it('returns null when caller does not own the task', async () => {
    mockFindById.mockResolvedValue(makeRow({ owner_id: 'user-2' }))
    expect(await updateTaskForOwner('t1', 'user-1', { title: 'X' })).toBeNull()
  })

  it('stamps completed_at when toggling is_completed: true', async () => {
    mockFindById.mockResolvedValueOnce(makeRow({ is_completed: false }))
    mockFindById.mockResolvedValueOnce(makeRow({ is_completed: true }))
    mockUpdateById.mockResolvedValue({ data: makeRow() })
    await updateTaskForOwner('t1', 'user-1', { is_completed: true })
    const patch = mockUpdateById.mock.calls[0][2]
    expect(typeof patch.completed_at).toBe('string')
  })

  it('clears completed_at when toggling is_completed: false', async () => {
    mockFindById.mockResolvedValueOnce(makeRow({ is_completed: true }))
    mockFindById.mockResolvedValueOnce(makeRow({ is_completed: false }))
    mockUpdateById.mockResolvedValue({ data: makeRow() })
    await updateTaskForOwner('t1', 'user-1', { is_completed: false })
    const patch = mockUpdateById.mock.calls[0][2]
    expect(patch.completed_at).toBeNull()
  })
})

describe('deleteTaskForOwner', () => {
  it('refuses to delete a task not owned by the caller', async () => {
    mockFindById.mockResolvedValue(makeRow({ owner_id: 'user-2' }))
    expect(await deleteTaskForOwner('t1', 'user-1')).toBe(false)
    expect(mockDeleteById).not.toHaveBeenCalled()
  })

  it('deletes when the caller owns the task', async () => {
    mockFindById.mockResolvedValue(makeRow({ owner_id: 'user-1' }))
    mockDeleteById.mockResolvedValue({ affected: 1 })
    expect(await deleteTaskForOwner('t1', 'user-1')).toBe(true)
    expect(mockDeleteById).toHaveBeenCalledWith('tasks', 't1')
  })
})

describe('reorderTasksForOwner', () => {
  it('skips items the caller does not own', async () => {
    mockFindById
      .mockResolvedValueOnce(makeRow({ id: 'a', owner_id: 'user-1' }))
      .mockResolvedValueOnce(makeRow({ id: 'b', owner_id: 'user-2' }))
      .mockResolvedValueOnce(makeRow({ id: 'c', owner_id: 'user-1' }))
    const updated = await reorderTasksForOwner('user-1', [
      { id: 'a', position: 1 },
      { id: 'b', position: 2 },
      { id: 'c', position: 3 },
    ])
    expect(updated).toBe(2)
    expect(mockUpdateById).toHaveBeenCalledTimes(2)
  })
})
