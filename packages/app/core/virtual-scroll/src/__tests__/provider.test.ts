import { beforeEach, describe, expect, it, vi } from 'vitest'

import { unbond } from '@molecule/app-bond'

import { createVirtualizer, getProvider, hasProvider, setProvider } from '../provider.js'
import type {
  VirtualItem,
  VirtualScrollInstance,
  VirtualScrollOptions,
  VirtualScrollProvider,
} from '../types.js'

/** Creates a minimal mock VirtualScrollInstance. */
function createMockInstance(options: VirtualScrollOptions): VirtualScrollInstance {
  let count = options.count
  let currentOffset = options.initialOffset ?? 0
  const scrollingState = false
  const itemSize = options.estimateSize(0)

  return {
    getVirtualItems(): VirtualItem[] {
      const overscan = options.overscan ?? 1
      const visible = Math.min(count, overscan + 5)
      const items: VirtualItem[] = []
      for (let i = 0; i < visible; i++) {
        items.push({
          key: i,
          index: i,
          start: i * itemSize,
          end: (i + 1) * itemSize,
          size: itemSize,
          lane: 0,
        })
      }
      return items
    },
    getTotalSize: () => count * itemSize,
    isScrolling: () => scrollingState,
    getScrollOffset: () => currentOffset,
    scrollToIndex: vi.fn((index: number) => {
      currentOffset = index * itemSize
    }),
    scrollToOffset: vi.fn((offset: number) => {
      currentOffset = offset
    }),
    measure: vi.fn(),
    measureElement: vi.fn(),
    resizeItem: vi.fn(),
    setCount: (newCount: number) => {
      count = newCount
    },
    setOptions: vi.fn(),
    destroy: vi.fn(),
  }
}

/** Creates a mock VirtualScrollProvider. */
function createMockProvider(): VirtualScrollProvider {
  return {
    createVirtualizer: (_scrollElement: unknown, options: VirtualScrollOptions) =>
      createMockInstance(options),
  }
}

describe('VirtualScroll provider', () => {
  beforeEach(() => {
    unbond('virtual-scroll')
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
      expect(() => getProvider()).toThrow('@molecule/app-virtual-scroll')
    })
  })

  describe('createVirtualizer', () => {
    it('delegates to the bonded provider', () => {
      const mock = createMockProvider()
      const spy = vi.spyOn(mock, 'createVirtualizer')
      setProvider(mock)

      const scrollEl = {}
      const options: VirtualScrollOptions = {
        count: 1000,
        estimateSize: () => 50,
        overscan: 5,
      }

      const instance = createVirtualizer(scrollEl, options)
      expect(spy).toHaveBeenCalledWith(scrollEl, options)
      expect(instance.getTotalSize()).toBe(50000)
    })

    it('throws when no provider is bonded', () => {
      expect(() => createVirtualizer({}, { count: 10, estimateSize: () => 50 })).toThrow(
        '@molecule/app-virtual-scroll',
      )
    })
  })
})

describe('VirtualScrollInstance (mock conformance)', () => {
  let instance: VirtualScrollInstance

  beforeEach(() => {
    unbond('virtual-scroll')
    setProvider(createMockProvider())
    instance = createVirtualizer(
      {},
      {
        count: 100,
        estimateSize: () => 40,
        overscan: 3,
      },
    )
  })

  it('getVirtualItems returns virtual items', () => {
    const items = instance.getVirtualItems()
    expect(items.length).toBeGreaterThan(0)
    expect(items[0]).toMatchObject({
      key: 0,
      index: 0,
      start: 0,
      end: 40,
      size: 40,
      lane: 0,
    })
  })

  it('getTotalSize returns total height/width', () => {
    expect(instance.getTotalSize()).toBe(4000)
  })

  it('isScrolling returns false by default', () => {
    expect(instance.isScrolling()).toBe(false)
  })

  it('getScrollOffset returns 0 by default', () => {
    expect(instance.getScrollOffset()).toBe(0)
  })

  it('scrollToIndex is callable', () => {
    expect(() => instance.scrollToIndex(50)).not.toThrow()
  })

  it('scrollToOffset is callable', () => {
    expect(() => instance.scrollToOffset(500)).not.toThrow()
  })

  it('measure is callable', () => {
    expect(() => instance.measure()).not.toThrow()
  })

  it('measureElement is callable', () => {
    expect(() => instance.measureElement(null)).not.toThrow()
  })

  it('resizeItem is callable', () => {
    expect(() => instance.resizeItem(0, 60)).not.toThrow()
  })

  it('setCount updates the total count', () => {
    instance.setCount(200)
    expect(instance.getTotalSize()).toBe(8000)
  })

  it('setOptions is callable', () => {
    expect(() => instance.setOptions({ overscan: 10 })).not.toThrow()
  })

  it('destroy is callable', () => {
    expect(() => instance.destroy()).not.toThrow()
  })
})
