import { KeyboardSensor, PointerSensor } from '@dnd-kit/core'
import type { DragEndEvent as DndKitDragEndEvent } from '@dnd-kit/core'
import {
  horizontalListSortingStrategy,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { render, screen } from '@testing-library/react'
import type { JSX } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { DragEndEvent } from '@molecule/app-drag-drop'

import {
  SortableList,
  createSortableSensors,
  handleSortableDragEnd,
  resolveSortingStrategy,
  useSortableItem,
} from '../react.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface TestItem {
  id: string
  label: string
}

function items(count: number): TestItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    label: `Item ${i + 1}`,
  }))
}

/**
 * Build a minimal @dnd-kit drag-end event. Only `active`/`over` (and
 * `active.data.current`) are read by the handler, so the rest of the real
 * event shape is intentionally omitted — this is a deliberately-minimal test
 * fixture.
 */
function dragEndEvent(activeId: string, overId: string | null): DndKitDragEndEvent {
  return {
    active: { id: activeId, data: { current: { from: activeId } } },
    over: overId === null ? null : { id: overId, data: { current: undefined } },
  } as unknown as DndKitDragEndEvent
}

/** A real sortable row driven by the actual `useSortableItem` hook. */
function Row({ item }: { item: TestItem }): JSX.Element {
  const { setNodeRef, attributes, listeners, style } = useSortableItem({ id: item.id })
  return (
    <li
      ref={setNodeRef}
      style={style}
      data-testid={`row-${item.id}`}
      {...attributes}
      {...listeners}
    >
      {item.label}
    </li>
  )
}

// ---------------------------------------------------------------------------
// Sensors — pointer + keyboard (keyboard accessibility)
// ---------------------------------------------------------------------------

describe('createSortableSensors', () => {
  it('wires both a pointer sensor and a keyboard sensor', () => {
    const sensors = createSortableSensors()
    expect(sensors.some((s) => s.sensor === PointerSensor)).toBe(true)
    expect(sensors.some((s) => s.sensor === KeyboardSensor)).toBe(true)
  })

  it('gives the keyboard sensor a coordinate getter so reordering is keyboard-accessible', () => {
    const sensors = createSortableSensors()
    const keyboard = sensors.find((s) => s.sensor === KeyboardSensor)
    expect(keyboard).toBeDefined()
    expect(
      (keyboard?.options as { coordinateGetter?: unknown } | undefined)?.coordinateGetter,
    ).toBeTypeOf('function')
  })

  it('applies activationDistance to the pointer sensor', () => {
    const sensors = createSortableSensors({ activationDistance: 8 })
    const pointer = sensors.find((s) => s.sensor === PointerSensor)
    expect(pointer?.options).toEqual({ activationConstraint: { distance: 8 } })
  })

  it('applies activationDelay (with tolerance) to the pointer sensor, preferring delay over distance', () => {
    const sensors = createSortableSensors({ activationDelay: 120, activationDistance: 3 })
    const pointer = sensors.find((s) => s.sensor === PointerSensor)
    expect(pointer?.options).toEqual({ activationConstraint: { delay: 120, tolerance: 3 } })
  })
})

// ---------------------------------------------------------------------------
// Strategy resolution
// ---------------------------------------------------------------------------

describe('resolveSortingStrategy', () => {
  it('defaults to the vertical list strategy', () => {
    expect(resolveSortingStrategy()).toBe(verticalListSortingStrategy)
    expect(resolveSortingStrategy('vertical')).toBe(verticalListSortingStrategy)
  })

  it('maps a horizontal axis to the horizontal list strategy', () => {
    expect(resolveSortingStrategy('horizontal')).toBe(horizontalListSortingStrategy)
  })

  it('maps a "both" axis to the grid (rect) strategy', () => {
    expect(resolveSortingStrategy('both')).toBe(rectSortingStrategy)
  })

  it('honors an explicit strategy override regardless of axis', () => {
    expect(resolveSortingStrategy('vertical', 'grid')).toBe(rectSortingStrategy)
    expect(resolveSortingStrategy('vertical', 'horizontal')).toBe(horizontalListSortingStrategy)
  })
})

// ---------------------------------------------------------------------------
// Drag-end bridge — THE reorder (a drop invokes onReorder with the new order)
// ---------------------------------------------------------------------------

describe('handleSortableDragEnd', () => {
  it('reorders the items with arrayMove and invokes onReorder with the new order', () => {
    const onReorder = vi.fn()
    const data = items(3) // ['1', '2', '3']

    handleSortableDragEnd(dragEndEvent('1', '3'), { items: data, onReorder })

    expect(onReorder).toHaveBeenCalledTimes(1)
    const next = onReorder.mock.calls[0][0] as TestItem[]
    expect(next.map((i) => i.id)).toEqual(['2', '3', '1'])
    // Original array is not mutated (arrayMove returns a new array).
    expect(data.map((i) => i.id)).toEqual(['1', '2', '3'])
  })

  it('reorders correctly when dragging upward too', () => {
    const onReorder = vi.fn()
    const data = items(4) // ['1', '2', '3', '4']

    handleSortableDragEnd(dragEndEvent('4', '2'), { items: data, onReorder })

    const next = onReorder.mock.calls[0][0] as TestItem[]
    expect(next.map((i) => i.id)).toEqual(['1', '4', '2', '3'])
  })

  it('emits the core onDragEnd event with id, overId, and data', () => {
    const onDragEnd = vi.fn<(event: DragEndEvent) => void>()
    handleSortableDragEnd(dragEndEvent('1', '3'), {
      items: items(3),
      onReorder: vi.fn(),
      onDragEnd,
    })
    expect(onDragEnd).toHaveBeenCalledWith({ id: '1', overId: '3', data: { from: '1' } })
  })

  it('does not reorder when the item is dropped in place (active === over)', () => {
    const onReorder = vi.fn()
    const onDragEnd = vi.fn()
    handleSortableDragEnd(dragEndEvent('2', '2'), { items: items(3), onReorder, onDragEnd })
    expect(onReorder).not.toHaveBeenCalled()
    // The drag-end event still fires (the drag happened, it just didn't move).
    expect(onDragEnd).toHaveBeenCalledWith({ id: '2', overId: '2', data: { from: '2' } })
  })

  it('does not reorder when dropped outside any target (over is null)', () => {
    const onReorder = vi.fn()
    const onDragEnd = vi.fn()
    handleSortableDragEnd(dragEndEvent('1', null), { items: items(3), onReorder, onDragEnd })
    expect(onReorder).not.toHaveBeenCalled()
    expect(onDragEnd).toHaveBeenCalledWith({ id: '1', overId: undefined, data: { from: '1' } })
  })

  it('is a no-op reorder when disabled', () => {
    const onReorder = vi.fn()
    handleSortableDragEnd(dragEndEvent('1', '3'), { items: items(3), onReorder, disabled: true })
    expect(onReorder).not.toHaveBeenCalled()
  })

  it('does not reorder when an id is not found in the list', () => {
    const onReorder = vi.fn()
    handleSortableDragEnd(dragEndEvent('1', 'nope'), { items: items(3), onReorder })
    expect(onReorder).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// SortableList — real render inside a real DndContext + SortableContext
// ---------------------------------------------------------------------------

describe('SortableList', () => {
  it('renders sortable rows inside a real @dnd-kit context', () => {
    const data = items(3)
    render(
      <SortableList items={data} onReorder={vi.fn()}>
        <ul>
          {data.map((item) => (
            <Row key={item.id} item={item} />
          ))}
        </ul>
      </SortableList>,
    )

    expect(screen.getByTestId('row-1').textContent).toBe('Item 1')
    expect(screen.getByTestId('row-2')).toBeTruthy()
    expect(screen.getByTestId('row-3')).toBeTruthy()
  })

  it('makes each row keyboard-focusable via the useSortable accessibility attributes', () => {
    const data = items(2)
    render(
      <SortableList items={data} onReorder={vi.fn()}>
        <ul>
          {data.map((item) => (
            <Row key={item.id} item={item} />
          ))}
        </ul>
      </SortableList>,
    )

    const row = screen.getByTestId('row-1')
    // `useSortable` spreads role="button" + tabindex="0" so the row is a
    // focusable, activatable drag target for the keyboard sensor.
    expect(row.getAttribute('role')).toBe('button')
    expect(row.getAttribute('tabindex')).toBe('0')
  })

  it('renders without throwing when the list is disabled', () => {
    const data = items(2)
    expect(() =>
      render(
        <SortableList items={data} onReorder={vi.fn()} disabled>
          <ul>
            {data.map((item) => (
              <Row key={item.id} item={item} />
            ))}
          </ul>
        </SortableList>,
      ),
    ).not.toThrow()
  })
})
