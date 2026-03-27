import { beforeEach, describe, expect, it, vi } from 'vitest'

import { unbond } from '@molecule/app-bond'

import {
  createDraggable,
  createDroppable,
  createSortable,
  getProvider,
  hasProvider,
  setProvider,
} from '../provider.js'
import type {
  DragDropProvider,
  DraggableInstance,
  DraggableOptions,
  DroppableInstance,
  DroppableOptions,
  SortableInstance,
  SortableOptions,
} from '../types.js'

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

interface TestItem {
  id: string
  label: string
}

function createMockSortableInstance<T extends { id: string }>(
  options: SortableOptions<T>,
): SortableInstance<T> {
  const state = { items: [...options.items], disabled: options.disabled ?? false }

  return {
    getItems: () => state.items,
    setItems: (newItems: T[]) => {
      state.items = [...newItems]
    },
    getActiveId: () => null as string | null,
    setDisabled: (d: boolean) => {
      state.disabled = d
    },
    destroy: vi.fn(),
  }
}

function createMockDraggableInstance(options: DraggableOptions): DraggableInstance {
  const state = { disabled: options.disabled ?? false, data: options.data as unknown }

  return {
    getId: () => options.id,
    isDragging: () => false,
    setDisabled: (d: boolean) => {
      state.disabled = d
    },
    setData: (d: unknown) => {
      state.data = d
    },
    destroy: vi.fn(),
  }
}

function createMockDroppableInstance(options: DroppableOptions): DroppableInstance {
  const state = { disabled: options.disabled ?? false }

  return {
    getId: () => options.id,
    isOver: () => false,
    setDisabled: (d: boolean) => {
      state.disabled = d
    },
    destroy: vi.fn(),
  }
}

function createMockProvider(): DragDropProvider {
  return {
    createSortable: <T extends { id: string }>(opts: SortableOptions<T>) =>
      createMockSortableInstance(opts),
    createDraggable: (opts: DraggableOptions) => createMockDraggableInstance(opts),
    createDroppable: (opts: DroppableOptions) => createMockDroppableInstance(opts),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DragDrop provider', () => {
  beforeEach(() => {
    unbond('drag-drop')
  })

  describe('setProvider / getProvider / hasProvider', () => {
    it('hasProvider returns false when no provider is bonded', () => {
      expect(hasProvider()).toBe(false)
    })

    it('setProvider bonds the provider and hasProvider returns true', () => {
      setProvider(createMockProvider())
      expect(hasProvider()).toBe(true)
    })

    it('getProvider returns the bonded provider', () => {
      const mock = createMockProvider()
      setProvider(mock)
      expect(getProvider()).toBe(mock)
    })

    it('getProvider throws when no provider is bonded', () => {
      expect(() => getProvider()).toThrow('@molecule/app-drag-drop')
    })
  })

  describe('createSortable', () => {
    it('delegates to the bonded provider', () => {
      const mock = createMockProvider()
      const spy = vi.spyOn(mock, 'createSortable')
      setProvider(mock)

      const options: SortableOptions<TestItem> = {
        items: [
          { id: '1', label: 'A' },
          { id: '2', label: 'B' },
          { id: '3', label: 'C' },
        ],
        axis: 'vertical',
        onReorder: vi.fn(),
      }

      const instance = createSortable(options)
      expect(spy).toHaveBeenCalledWith(options)
      expect(instance.getItems()).toHaveLength(3)
    })

    it('throws when no provider is bonded', () => {
      expect(() => createSortable({ items: [], onReorder: vi.fn() })).toThrow(
        '@molecule/app-drag-drop',
      )
    })
  })

  describe('createDraggable', () => {
    it('delegates to the bonded provider', () => {
      const mock = createMockProvider()
      const spy = vi.spyOn(mock, 'createDraggable')
      setProvider(mock)

      const options: DraggableOptions = { id: 'drag-1', data: { type: 'card' } }
      const instance = createDraggable(options)

      expect(spy).toHaveBeenCalledWith(options)
      expect(instance.getId()).toBe('drag-1')
    })

    it('throws when no provider is bonded', () => {
      expect(() => createDraggable({ id: 'x' })).toThrow('@molecule/app-drag-drop')
    })
  })

  describe('createDroppable', () => {
    it('delegates to the bonded provider', () => {
      const mock = createMockProvider()
      const spy = vi.spyOn(mock, 'createDroppable')
      setProvider(mock)

      const onDrop = vi.fn()
      const options: DroppableOptions = { id: 'drop-1', accept: ['card'], onDrop }
      const instance = createDroppable(options)

      expect(spy).toHaveBeenCalledWith(options)
      expect(instance.getId()).toBe('drop-1')
    })

    it('throws when no provider is bonded', () => {
      expect(() => createDroppable({ id: 'x', onDrop: vi.fn() })).toThrow('@molecule/app-drag-drop')
    })
  })
})

describe('SortableInstance (mock conformance)', () => {
  let instance: SortableInstance<TestItem>

  beforeEach(() => {
    unbond('drag-drop')
    setProvider(createMockProvider())
    instance = createSortable<TestItem>({
      items: [
        { id: '1', label: 'A' },
        { id: '2', label: 'B' },
        { id: '3', label: 'C' },
      ],
      onReorder: vi.fn(),
    })
  })

  it('getItems returns the current items', () => {
    expect(instance.getItems()).toEqual([
      { id: '1', label: 'A' },
      { id: '2', label: 'B' },
      { id: '3', label: 'C' },
    ])
  })

  it('setItems replaces items', () => {
    instance.setItems([{ id: '4', label: 'D' }])
    expect(instance.getItems()).toEqual([{ id: '4', label: 'D' }])
  })

  it('getActiveId returns null when nothing is being dragged', () => {
    expect(instance.getActiveId()).toBeNull()
  })

  it('setDisabled is callable', () => {
    expect(() => instance.setDisabled(true)).not.toThrow()
  })

  it('destroy is callable', () => {
    expect(() => instance.destroy()).not.toThrow()
  })
})

describe('DraggableInstance (mock conformance)', () => {
  let instance: DraggableInstance

  beforeEach(() => {
    unbond('drag-drop')
    setProvider(createMockProvider())
    instance = createDraggable({ id: 'item-1', data: { kind: 'task' } })
  })

  it('getId returns the draggable id', () => {
    expect(instance.getId()).toBe('item-1')
  })

  it('isDragging returns false by default', () => {
    expect(instance.isDragging()).toBe(false)
  })

  it('setDisabled is callable', () => {
    expect(() => instance.setDisabled(true)).not.toThrow()
  })

  it('setData is callable', () => {
    expect(() => instance.setData({ kind: 'updated' })).not.toThrow()
  })

  it('destroy is callable', () => {
    expect(() => instance.destroy()).not.toThrow()
  })
})

describe('DroppableInstance (mock conformance)', () => {
  let instance: DroppableInstance

  beforeEach(() => {
    unbond('drag-drop')
    setProvider(createMockProvider())
    instance = createDroppable({ id: 'zone-1', onDrop: vi.fn() })
  })

  it('getId returns the droppable id', () => {
    expect(instance.getId()).toBe('zone-1')
  })

  it('isOver returns false by default', () => {
    expect(instance.isOver()).toBe(false)
  })

  it('setDisabled is callable', () => {
    expect(() => instance.setDisabled(true)).not.toThrow()
  })

  it('destroy is callable', () => {
    expect(() => instance.destroy()).not.toThrow()
  })
})
