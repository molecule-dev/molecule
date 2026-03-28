import { describe, expect, it, vi } from 'vitest'

import type { DraggableOptions, DroppableOptions, SortableOptions } from '@molecule/app-drag-drop'

import { createDndKitProvider, provider } from '../provider.js'
import type {
  DndKitDraggableInstance,
  DndKitDroppableInstance,
  DndKitSortableInstance,
} from '../types.js'

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

function sortableOpts(
  overrides: Partial<SortableOptions<TestItem>> = {},
): SortableOptions<TestItem> {
  return {
    items: items(5),
    onReorder: vi.fn(),
    ...overrides,
  }
}

function draggableOpts(overrides: Partial<DraggableOptions> = {}): DraggableOptions {
  return {
    id: 'drag-1',
    ...overrides,
  }
}

function droppableOpts(overrides: Partial<DroppableOptions> = {}): DroppableOptions {
  return {
    id: 'drop-1',
    onDrop: vi.fn(),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('@molecule/app-drag-drop-dndkit', () => {
  // -------------------------------------------------------------------------
  // Provider conformance
  // -------------------------------------------------------------------------
  describe('provider conformance', () => {
    it('exports a typed provider with all required methods', () => {
      expect(provider).toBeDefined()
      expect(typeof provider.createSortable).toBe('function')
      expect(typeof provider.createDraggable).toBe('function')
      expect(typeof provider.createDroppable).toBe('function')
    })

    it('createDndKitProvider returns a DragDropProvider', () => {
      const p = createDndKitProvider()
      expect(typeof p.createSortable).toBe('function')
      expect(typeof p.createDraggable).toBe('function')
      expect(typeof p.createDroppable).toBe('function')
    })

    it('createDndKitProvider accepts config options', () => {
      const p = createDndKitProvider({
        activationDelay: 100,
        activationDistance: 5,
        cancelOnEscape: false,
      })
      expect(typeof p.createSortable).toBe('function')
    })
  })

  // -------------------------------------------------------------------------
  // Sortable
  // -------------------------------------------------------------------------
  describe('createSortable', () => {
    it('creates a sortable instance with all interface methods', () => {
      const instance = provider.createSortable(sortableOpts())
      expect(typeof instance.getItems).toBe('function')
      expect(typeof instance.setItems).toBe('function')
      expect(typeof instance.getActiveId).toBe('function')
      expect(typeof instance.setDisabled).toBe('function')
      expect(typeof instance.destroy).toBe('function')
    })

    it('getItems returns the initial items', () => {
      const initial = items(3)
      const instance = provider.createSortable(sortableOpts({ items: initial }))
      expect(instance.getItems()).toEqual(initial)
    })

    it('getItems returns a copy, not a reference', () => {
      const instance = provider.createSortable(sortableOpts())
      const a = instance.getItems()
      const b = instance.getItems()
      expect(a).toEqual(b)
      expect(a).not.toBe(b)
    })

    it('setItems replaces the item list', () => {
      const instance = provider.createSortable(sortableOpts())
      const newItems = items(2)
      instance.setItems(newItems)
      expect(instance.getItems()).toEqual(newItems)
    })

    it('getActiveId returns null initially', () => {
      const instance = provider.createSortable(sortableOpts())
      expect(instance.getActiveId()).toBeNull()
    })

    it('setDisabled does not throw', () => {
      const instance = provider.createSortable(sortableOpts())
      expect(() => instance.setDisabled(true)).not.toThrow()
      expect(() => instance.setDisabled(false)).not.toThrow()
    })

    it('destroy clears items and active id', () => {
      const instance = provider.createSortable(sortableOpts())
      instance.destroy()
      expect(instance.getItems()).toEqual([])
      expect(instance.getActiveId()).toBeNull()
    })

    it('_setActiveId updates active state', () => {
      const instance = provider.createSortable(
        sortableOpts(),
      ) as unknown as DndKitSortableInstance<TestItem>
      instance._setActiveId('3')
      expect(instance.getActiveId()).toBe('3')
      instance._setActiveId(null)
      expect(instance.getActiveId()).toBeNull()
    })

    it('_reorder moves items and calls onReorder', () => {
      const onReorder = vi.fn()
      const initial = items(5)
      const instance = provider.createSortable(
        sortableOpts({ items: initial, onReorder }),
      ) as unknown as DndKitSortableInstance<TestItem>

      instance._reorder(0, 2)
      expect(onReorder).toHaveBeenCalledTimes(1)
      const reordered = onReorder.mock.calls[0][0] as TestItem[]
      expect(reordered[0].id).toBe('2')
      expect(reordered[1].id).toBe('3')
      expect(reordered[2].id).toBe('1')
    })

    it('_reorder ignores out-of-bounds indices', () => {
      const onReorder = vi.fn()
      const instance = provider.createSortable(
        sortableOpts({ onReorder }),
      ) as unknown as DndKitSortableInstance<TestItem>

      instance._reorder(-1, 0)
      instance._reorder(0, 100)
      expect(onReorder).not.toHaveBeenCalled()
    })

    it('_reorder is a no-op when disabled', () => {
      const onReorder = vi.fn()
      const instance = provider.createSortable(
        sortableOpts({ onReorder, disabled: true }),
      ) as unknown as DndKitSortableInstance<TestItem>

      instance._reorder(0, 2)
      expect(onReorder).not.toHaveBeenCalled()
    })

    it('setDisabled then _reorder reflects new disabled state', () => {
      const onReorder = vi.fn()
      const instance = provider.createSortable(
        sortableOpts({ onReorder }),
      ) as unknown as DndKitSortableInstance<TestItem>

      instance.setDisabled(true)
      instance._reorder(0, 1)
      expect(onReorder).not.toHaveBeenCalled()

      instance.setDisabled(false)
      instance._reorder(0, 1)
      expect(onReorder).toHaveBeenCalledTimes(1)
    })
  })

  // -------------------------------------------------------------------------
  // Draggable
  // -------------------------------------------------------------------------
  describe('createDraggable', () => {
    it('creates a draggable instance with all interface methods', () => {
      const instance = provider.createDraggable(draggableOpts())
      expect(typeof instance.getId).toBe('function')
      expect(typeof instance.isDragging).toBe('function')
      expect(typeof instance.setDisabled).toBe('function')
      expect(typeof instance.setData).toBe('function')
      expect(typeof instance.destroy).toBe('function')
    })

    it('getId returns the configured id', () => {
      const instance = provider.createDraggable(draggableOpts({ id: 'my-item' }))
      expect(instance.getId()).toBe('my-item')
    })

    it('isDragging returns false initially', () => {
      const instance = provider.createDraggable(draggableOpts())
      expect(instance.isDragging()).toBe(false)
    })

    it('_setDragging updates drag state', () => {
      const instance = provider.createDraggable(
        draggableOpts(),
      ) as unknown as DndKitDraggableInstance
      instance._setDragging(true)
      expect(instance.isDragging()).toBe(true)
      instance._setDragging(false)
      expect(instance.isDragging()).toBe(false)
    })

    it('setData updates the data payload', () => {
      const instance = provider.createDraggable(
        draggableOpts({ data: { type: 'card' } }),
      ) as unknown as DndKitDraggableInstance
      expect(instance._getData()).toEqual({ type: 'card' })

      instance.setData({ type: 'task', priority: 1 })
      expect(instance._getData()).toEqual({ type: 'task', priority: 1 })
    })

    it('setDisabled does not throw', () => {
      const instance = provider.createDraggable(draggableOpts())
      expect(() => instance.setDisabled(true)).not.toThrow()
      expect(() => instance.setDisabled(false)).not.toThrow()
    })

    it('destroy resets dragging state', () => {
      const instance = provider.createDraggable(
        draggableOpts(),
      ) as unknown as DndKitDraggableInstance
      instance._setDragging(true)
      instance.destroy()
      expect(instance.isDragging()).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // Droppable
  // -------------------------------------------------------------------------
  describe('createDroppable', () => {
    it('creates a droppable instance with all interface methods', () => {
      const instance = provider.createDroppable(droppableOpts())
      expect(typeof instance.getId).toBe('function')
      expect(typeof instance.isOver).toBe('function')
      expect(typeof instance.setDisabled).toBe('function')
      expect(typeof instance.destroy).toBe('function')
    })

    it('getId returns the configured id', () => {
      const instance = provider.createDroppable(droppableOpts({ id: 'zone-a' }))
      expect(instance.getId()).toBe('zone-a')
    })

    it('isOver returns false initially', () => {
      const instance = provider.createDroppable(droppableOpts())
      expect(instance.isOver()).toBe(false)
    })

    it('_setOver updates hover state', () => {
      const instance = provider.createDroppable(
        droppableOpts(),
      ) as unknown as DndKitDroppableInstance
      instance._setOver(true)
      expect(instance.isOver()).toBe(true)
      instance._setOver(false)
      expect(instance.isOver()).toBe(false)
    })

    it('_accepts returns true when no accept filter', () => {
      const instance = provider.createDroppable(
        droppableOpts(),
      ) as unknown as DndKitDroppableInstance
      expect(instance._accepts('any-type')).toBe(true)
      expect(instance._accepts(undefined)).toBe(true)
    })

    it('_accepts respects accept filter', () => {
      const instance = provider.createDroppable(
        droppableOpts({ accept: ['card', 'task'] }),
      ) as unknown as DndKitDroppableInstance
      expect(instance._accepts('card')).toBe(true)
      expect(instance._accepts('task')).toBe(true)
      expect(instance._accepts('file')).toBe(false)
      expect(instance._accepts(undefined)).toBe(false)
    })

    it('_accepts returns false when disabled', () => {
      const instance = provider.createDroppable(
        droppableOpts({ disabled: true }),
      ) as unknown as DndKitDroppableInstance
      expect(instance._accepts('any')).toBe(false)
    })

    it('_handleDrop invokes onDrop callback', () => {
      const onDrop = vi.fn()
      const instance = provider.createDroppable(
        droppableOpts({ onDrop }),
      ) as unknown as DndKitDroppableInstance

      instance._handleDrop({ key: 'value' }, 'drag-1')
      expect(onDrop).toHaveBeenCalledWith({ key: 'value' }, 'drag-1')
    })

    it('_handleDrop is a no-op when disabled', () => {
      const onDrop = vi.fn()
      const instance = provider.createDroppable(
        droppableOpts({ onDrop, disabled: true }),
      ) as unknown as DndKitDroppableInstance

      instance._handleDrop({ key: 'value' }, 'drag-1')
      expect(onDrop).not.toHaveBeenCalled()
    })

    it('setDisabled does not throw', () => {
      const instance = provider.createDroppable(droppableOpts())
      expect(() => instance.setDisabled(true)).not.toThrow()
      expect(() => instance.setDisabled(false)).not.toThrow()
    })

    it('destroy resets hover state', () => {
      const instance = provider.createDroppable(
        droppableOpts(),
      ) as unknown as DndKitDroppableInstance
      instance._setOver(true)
      instance.destroy()
      expect(instance.isOver()).toBe(false)
    })
  })
})
