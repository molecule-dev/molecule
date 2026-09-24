/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written, through the dnd-kit bond.
 *
 * @module
 */
import { describe, expect, it, vi } from 'vitest'

import { provider } from '@molecule/app-drag-drop-dndkit'

import { createSortable, hasProvider, setProvider } from '../index.js'

interface Task {
  id: string
  title: string
}

describe('README @example', () => {
  it('creates a sortable through the bonded provider and replaces its order', () => {
    setProvider(provider)
    expect(hasProvider()).toBe(true)

    const tasks: Task[] = [
      { id: 't1', title: 'Write spec' },
      { id: 't2', title: 'Review PR' },
      { id: 't3', title: 'Ship it' },
    ]
    const onReorder = vi.fn()

    const sortable = createSortable<Task>({ items: tasks, axis: 'vertical', onReorder })
    expect(sortable.getItems().map((task) => task.title)).toEqual([
      'Write spec',
      'Review PR',
      'Ship it',
    ])

    sortable.setItems([
      { id: 't3', title: 'Ship it' },
      { id: 't1', title: 'Write spec' },
      { id: 't2', title: 'Review PR' },
    ])
    expect(sortable.getItems().map((task) => task.id)).toEqual(['t3', 't1', 't2'])
    // setItems() is an external replacement — it does not fire onReorder.
    expect(onReorder).not.toHaveBeenCalled()
    expect(sortable.getActiveId()).toBeNull()

    sortable.destroy()
    expect(sortable.getItems()).toEqual([])
  })
})
