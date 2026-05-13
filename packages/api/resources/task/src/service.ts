/**
 * Task business logic — pure data-access functions decoupled from Express.
 *
 * @module
 */

import {
  create,
  deleteById,
  findById,
  findMany,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'

import type { Task, TaskPriority, TaskRow } from './types.js'

const TABLE = 'tasks'

function toDateString(value: string | Date | null): string | null {
  if (value === null || value === undefined) return null
  if (value instanceof Date) {
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  if (typeof value === 'string') return value.length >= 10 ? value.slice(0, 10) : value
  return null
}

function toIsoString(value: string | Date | null): string | null {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

function priorityFromDb(raw: number | null | undefined): TaskPriority {
  const n = typeof raw === 'number' ? raw : 0
  if (n >= 1 && n <= 4) return n as TaskPriority
  return 4
}

function recurringSummary(rule: string | null): Task['recurring'] {
  if (!rule) return null
  const m = rule.match(/^every\s+\d+\s+(day|week|month|year)s?$/i)
  if (!m) return null
  const unit = m[1].toLowerCase()
  if (unit === 'day') return 'daily'
  if (unit === 'week') return 'weekly'
  if (unit === 'month') return 'monthly'
  if (unit === 'year') return 'yearly'
  return null
}

/** Serialise a DB row into a wire-format Task. */
export function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    priority: priorityFromDb(row.priority),
    due_date: toDateString(row.due_date),
    due_time: row.due_time ?? null,
    parent_id: row.parent_id ?? null,
    recurrence_rule: row.recurrence_rule ?? null,
    recurring: recurringSummary(row.recurrence_rule),
    completed: !!row.is_completed,
    completed_at: toIsoString(row.completed_at),
    position: typeof row.position === 'number' ? row.position : Number(row.position ?? 0),
    created_at: toIsoString(row.created_at) ?? '',
    updated_at: toIsoString(row.updated_at) ?? '',
  }
}

/** List tasks for an owner with optional filters. */
export async function listTasksForOwner(
  ownerId: string,
  opts: {
    parent_id?: string | null
    completed?: boolean
    due_date?: string
    filter?: 'today' | 'upcoming'
    limit?: number
    offset?: number
  } = {},
): Promise<Task[]> {
  const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: ownerId }]
  if (opts.parent_id !== undefined) {
    if (opts.parent_id === null) where.push({ field: 'parent_id', operator: 'is_null' })
    else where.push({ field: 'parent_id', operator: '=', value: opts.parent_id })
  }
  if (typeof opts.completed === 'boolean') {
    where.push({ field: 'is_completed', operator: '=', value: opts.completed })
  }
  if (opts.due_date) where.push({ field: 'due_date', operator: '=', value: opts.due_date })
  if (opts.filter === 'today') {
    const today = new Date().toISOString().slice(0, 10)
    where.push({ field: 'due_date', operator: '=', value: today })
    where.push({ field: 'is_completed', operator: '=', value: false })
  } else if (opts.filter === 'upcoming') {
    where.push({ field: 'due_date', operator: 'is_not_null' })
    where.push({ field: 'is_completed', operator: '=', value: false })
  }
  const rows = await findMany<TaskRow>(TABLE, {
    where,
    orderBy: [
      { field: 'priority', direction: 'desc' },
      { field: 'position', direction: 'asc' },
    ],
    limit: opts.limit,
    offset: opts.offset,
  })
  return rows.map(toTask)
}

/** Load a single task scoped to its owner. Returns null if missing or not owned. */
export async function getTaskForOwner(taskId: string, ownerId: string): Promise<Task | null> {
  const row = await findById<TaskRow>(TABLE, taskId)
  if (!row || row.owner_id !== ownerId) return null
  return toTask(row)
}

export async function createTaskForOwner(
  ownerId: string,
  data: {
    title: string
    description?: string
    parent_id?: string | null
    priority?: number
    due_date?: string | null
    due_time?: string | null
    recurrence_rule?: string | null
    position?: number
  },
): Promise<Task> {
  const result = await create<TaskRow>(TABLE, {
    owner_id: ownerId,
    title: data.title,
    description: data.description ?? null,
    parent_id: data.parent_id ?? null,
    priority: priorityFromDb(data.priority),
    due_date: data.due_date ?? null,
    due_time: data.due_time ?? null,
    recurrence_rule: data.recurrence_rule ?? null,
    position: data.position ?? 0,
    is_completed: false,
    completed_at: null,
  })
  return toTask(result.data!)
}

export async function updateTaskForOwner(
  taskId: string,
  ownerId: string,
  patch: Partial<{
    title: string
    description: string | null
    parent_id: string | null
    priority: number
    due_date: string | null
    due_time: string | null
    recurrence_rule: string | null
    position: number
    is_completed: boolean
  }>,
): Promise<Task | null> {
  const existing = await findById<TaskRow>(TABLE, taskId)
  if (!existing || existing.owner_id !== ownerId) return null

  const updates: Record<string, unknown> = { ...patch }
  if (patch.priority !== undefined) updates.priority = priorityFromDb(patch.priority)
  // Maintain completed_at when toggling is_completed
  if (patch.is_completed === true && !existing.is_completed) {
    updates.completed_at = new Date().toISOString()
  } else if (patch.is_completed === false && existing.is_completed) {
    updates.completed_at = null
  }

  await updateById(TABLE, taskId, updates as Partial<TaskRow>)
  const next = await findById<TaskRow>(TABLE, taskId)
  return next ? toTask(next) : null
}

export async function deleteTaskForOwner(taskId: string, ownerId: string): Promise<boolean> {
  const row = await findById<TaskRow>(TABLE, taskId)
  if (!row || row.owner_id !== ownerId) return false
  await deleteById(TABLE, taskId)
  return true
}

export async function reorderTasksForOwner(
  ownerId: string,
  items: Array<{ id: string; position: number }>,
): Promise<number> {
  let updated = 0
  for (const item of items) {
    const row = await findById<TaskRow>(TABLE, item.id)
    if (!row || row.owner_id !== ownerId) continue
    await updateById(TABLE, item.id, { position: item.position })
    updated++
  }
  return updated
}
