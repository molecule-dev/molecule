/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import type { DragEndEvent as DndKitDragEndEvent } from '@dnd-kit/core'
import { act, render, screen } from '@testing-library/react'
import type { JSX } from 'react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { getProvider, setProvider } from '@molecule/app-drag-drop'

import { handleSortableDragEnd, provider, SortableList, useSortableItem } from '../index.js'

interface Task {
  id: string
  title: string
}

/**
 * The example's row component.
 *
 * @param props - The task to render.
 * @param props.task - The task.
 * @returns The sortable row.
 */
function TaskRow({ task }: { task: Task }): JSX.Element {
  const { setNodeRef, attributes, listeners, style } = useSortableItem({ id: task.id })
  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-mol-id={`task-${task.id}`}
    >
      {task.title}
    </li>
  )
}

let reorderSpy: ((tasks: Task[]) => void) | null = null

/**
 * The example's list component (with the setter observed for the test).
 *
 * @returns The sortable task list.
 */
function TaskList(): JSX.Element {
  const [tasks, setTasks] = useState<Task[]>([
    { id: 't1', title: 'Write spec' },
    { id: 't2', title: 'Review PR' },
    { id: 't3', title: 'Ship it' },
  ])
  reorderSpy = setTasks
  return (
    <SortableList items={tasks} onReorder={setTasks}>
      <ul>
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </ul>
    </SortableList>
  )
}

describe('README @example', () => {
  it('bonds the provider and renders keyboard-accessible sortable rows', () => {
    setProvider(provider)
    expect(getProvider()).toBe(provider)

    render(<TaskList />)

    const rows = screen.getAllByRole('button')
    expect(rows.map((row) => row.textContent)).toEqual(['Write spec', 'Review PR', 'Ship it'])
    expect(rows[0]?.getAttribute('aria-roledescription')).toBe('sortable')
    expect(rows[0]?.getAttribute('tabindex')).toBe('0')
    expect(rows[0]?.getAttribute('data-mol-id')).toBe('task-t1')
  })

  it('a drop reorders the rendered list through onReorder', () => {
    render(<TaskList />)
    const onReorder = vi.fn((next: Task[]) => reorderSpy?.(next))
    const items: Task[] = [
      { id: 't1', title: 'Write spec' },
      { id: 't2', title: 'Review PR' },
      { id: 't3', title: 'Ship it' },
    ]

    // The drop dnd-kit reports when row t1 is released over row t3 (the same
    // handler `SortableList` wires into `DndContext.onDragEnd`).
    const drop = {
      active: { id: 't1', data: { current: undefined } },
      over: { id: 't3', data: { current: undefined } },
    } as unknown as DndKitDragEndEvent
    act(() => {
      handleSortableDragEnd(drop, { items, onReorder, disabled: false })
    })

    expect(onReorder).toHaveBeenCalledTimes(1)
    const titles = screen.getAllByRole('button').map((row) => row.textContent)
    expect(titles).toEqual(['Review PR', 'Ship it', 'Write spec'])
  })
})
