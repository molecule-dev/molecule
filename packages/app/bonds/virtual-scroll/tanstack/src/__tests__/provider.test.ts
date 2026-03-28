import { describe, expect, it, vi } from 'vitest'

import type { VirtualScrollOptions } from '@molecule/app-virtual-scroll'

import { createTanStackProvider, provider } from '../provider.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createOptions(overrides: Partial<VirtualScrollOptions> = {}): VirtualScrollOptions {
  return {
    count: 1000,
    estimateSize: () => 50,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('@molecule/app-virtual-scroll-tanstack', () => {
  describe('provider conformance', () => {
    it('exports a typed provider with createVirtualizer method', () => {
      expect(provider).toBeDefined()
      expect(typeof provider.createVirtualizer).toBe('function')
    })

    it('createTanStackProvider returns a VirtualScrollProvider', () => {
      const p = createTanStackProvider()
      expect(typeof p.createVirtualizer).toBe('function')
    })

    it('createTanStackProvider accepts config options', () => {
      const p = createTanStackProvider({
        debug: false,
        isScrollingResetDelay: 200,
        useScrollendEvent: false,
      })
      expect(typeof p.createVirtualizer).toBe('function')
    })
  })

  describe('virtualizer creation (headless / null scroll element)', () => {
    it('creates a virtualizer with null scroll element', () => {
      const instance = provider.createVirtualizer(null, createOptions())
      expect(instance).toBeDefined()
      expect(typeof instance.getVirtualItems).toBe('function')
      expect(typeof instance.getTotalSize).toBe('function')
      expect(typeof instance.scrollToIndex).toBe('function')
      expect(typeof instance.scrollToOffset).toBe('function')
      expect(typeof instance.measure).toBe('function')
      expect(typeof instance.measureElement).toBe('function')
      expect(typeof instance.resizeItem).toBe('function')
      expect(typeof instance.setCount).toBe('function')
      expect(typeof instance.setOptions).toBe('function')
      expect(typeof instance.destroy).toBe('function')
    })

    it('creates a virtualizer with getter returning null', () => {
      const instance = provider.createVirtualizer(() => null, createOptions())
      expect(instance).toBeDefined()
    })

    it('getTotalSize returns estimated total for all items', () => {
      const instance = provider.createVirtualizer(
        null,
        createOptions({ count: 100, estimateSize: () => 40 }),
      )
      expect(instance.getTotalSize()).toBe(4000)
    })

    it('getTotalSize accounts for gap between items', () => {
      const instance = provider.createVirtualizer(
        null,
        createOptions({ count: 10, estimateSize: () => 50, gap: 10 }),
      )
      // 10 items * 50px + 9 gaps * 10px = 590
      expect(instance.getTotalSize()).toBe(590)
    })

    it('getTotalSize accounts for paddingStart and paddingEnd', () => {
      const instance = provider.createVirtualizer(
        null,
        createOptions({
          count: 5,
          estimateSize: () => 50,
          paddingStart: 20,
          paddingEnd: 30,
        }),
      )
      // 5 * 50 + 20 + 30 = 300
      expect(instance.getTotalSize()).toBe(300)
    })

    it('isScrolling returns false initially', () => {
      const instance = provider.createVirtualizer(null, createOptions())
      expect(instance.isScrolling()).toBe(false)
    })

    it('getScrollOffset returns 0 initially', () => {
      const instance = provider.createVirtualizer(null, createOptions())
      expect(instance.getScrollOffset()).toBe(0)
    })
  })

  describe('setCount', () => {
    it('updates the total count and recalculates total size', () => {
      const instance = provider.createVirtualizer(
        null,
        createOptions({ count: 100, estimateSize: () => 50 }),
      )
      expect(instance.getTotalSize()).toBe(5000)

      instance.setCount(200)
      expect(instance.getTotalSize()).toBe(10000)
    })

    it('handles count reduction', () => {
      const instance = provider.createVirtualizer(
        null,
        createOptions({ count: 100, estimateSize: () => 50 }),
      )
      instance.setCount(10)
      expect(instance.getTotalSize()).toBe(500)
    })

    it('handles zero count', () => {
      const instance = provider.createVirtualizer(
        null,
        createOptions({ count: 100, estimateSize: () => 50 }),
      )
      instance.setCount(0)
      expect(instance.getTotalSize()).toBe(0)
    })
  })

  describe('setOptions', () => {
    it('updates options and recalculates', () => {
      const instance = provider.createVirtualizer(
        null,
        createOptions({ count: 100, estimateSize: () => 50 }),
      )
      expect(instance.getTotalSize()).toBe(5000)

      instance.setOptions({ count: 50 })
      expect(instance.getTotalSize()).toBe(2500)
    })

    it('can update overscan', () => {
      const instance = provider.createVirtualizer(null, createOptions({ overscan: 2 }))
      expect(() => instance.setOptions({ overscan: 10 })).not.toThrow()
    })
  })

  describe('navigation methods', () => {
    it('scrollToIndex does not throw in headless mode', () => {
      const instance = provider.createVirtualizer(null, createOptions())
      expect(() => instance.scrollToIndex(50)).not.toThrow()
      expect(() =>
        instance.scrollToIndex(50, { align: 'center', behavior: 'smooth' }),
      ).not.toThrow()
    })

    it('scrollToOffset does not throw in headless mode', () => {
      const instance = provider.createVirtualizer(null, createOptions())
      expect(() => instance.scrollToOffset(500)).not.toThrow()
      expect(() => instance.scrollToOffset(500, { align: 'start' })).not.toThrow()
    })
  })

  describe('measurement methods', () => {
    it('measure does not throw', () => {
      const instance = provider.createVirtualizer(null, createOptions())
      expect(() => instance.measure()).not.toThrow()
    })

    it('measureElement does not throw with null', () => {
      const instance = provider.createVirtualizer(null, createOptions())
      expect(() => instance.measureElement(null)).not.toThrow()
    })

    it('resizeItem does not throw', () => {
      const instance = provider.createVirtualizer(null, createOptions())
      expect(() => instance.resizeItem(0, 60)).not.toThrow()
    })
  })

  describe('onChange callback', () => {
    it('accepts onChange in options', () => {
      const onChange = vi.fn()
      const instance = provider.createVirtualizer(null, createOptions({ onChange }))
      expect(instance).toBeDefined()
    })
  })

  describe('custom getItemKey', () => {
    it('accepts a custom key extractor', () => {
      const instance = provider.createVirtualizer(
        null,
        createOptions({
          getItemKey: (index) => `item-${index}`,
        }),
      )
      expect(instance).toBeDefined()
    })
  })

  describe('axis configuration', () => {
    it('creates a horizontal virtualizer', () => {
      const instance = provider.createVirtualizer(null, createOptions({ axis: 'horizontal' }))
      expect(instance).toBeDefined()
      expect(instance.getTotalSize()).toBe(50000) // 1000 * 50
    })

    it('defaults to vertical', () => {
      const instance = provider.createVirtualizer(null, createOptions())
      expect(instance).toBeDefined()
    })
  })

  describe('lanes (masonry)', () => {
    it('creates a virtualizer with multiple lanes', () => {
      const instance = provider.createVirtualizer(null, createOptions({ lanes: 3 }))
      expect(instance).toBeDefined()
    })
  })

  describe('destroy', () => {
    it('cleans up without throwing', () => {
      const instance = provider.createVirtualizer(null, createOptions())
      expect(() => instance.destroy()).not.toThrow()
    })

    it('double destroy does not throw', () => {
      const instance = provider.createVirtualizer(null, createOptions())
      instance.destroy()
      expect(() => instance.destroy()).not.toThrow()
    })
  })

  describe('variable size items', () => {
    it('calculates total size with variable item sizes', () => {
      const sizes = [30, 50, 70, 40, 60]
      const instance = provider.createVirtualizer(
        null,
        createOptions({
          count: 5,
          estimateSize: (index) => sizes[index],
        }),
      )
      // 30 + 50 + 70 + 40 + 60 = 250
      expect(instance.getTotalSize()).toBe(250)
    })
  })
})
