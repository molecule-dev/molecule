/**
 * Task domain types.
 *
 * @module
 */

/** Priority levels — 1 (lowest) through 4 (highest). */
export type TaskPriority = 1 | 2 | 3 | 4

/** Database row shape for a task. */
export interface TaskRow {
  id: string
  owner_id: string
  parent_id: string | null
  title: string
  description: string | null
  priority: TaskPriority
  due_date: string | Date | null
  due_time: string | null
  recurrence_rule: string | null
  position: number | string
  is_completed: boolean
  completed_at: string | Date | null
  created_at: string | Date
  updated_at: string | Date
}

/** Wire format — serialised for transport to the frontend. */
export interface Task {
  id: string
  title: string
  description: string | null
  priority: TaskPriority
  due_date: string | null
  due_time: string | null
  parent_id: string | null
  recurrence_rule: string | null
  recurring: 'daily' | 'weekly' | 'monthly' | 'yearly' | null
  completed: boolean
  completed_at: string | null
  position: number
  created_at: string
  updated_at: string
}
