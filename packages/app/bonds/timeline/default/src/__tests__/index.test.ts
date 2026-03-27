import { describe, expect, it } from 'vitest'

import type { TimelineProvider } from '@molecule/app-timeline'

import { createProvider, provider } from '../index.js'

describe('@molecule/app-timeline-default', () => {
  describe('provider', () => {
    it('should export a default provider instance', () => {
      expect(provider).toBeDefined()
      expect(provider.name).toBe('default')
    })

    it('should conform to TimelineProvider interface', () => {
      const p: TimelineProvider = provider
      expect(typeof p.createTimeline).toBe('function')
    })
  })

  describe('createProvider', () => {
    it('should create a provider with default config', () => {
      const p = createProvider()
      expect(p.name).toBe('default')
    })

    it('should create a provider with custom config', () => {
      const p = createProvider({ sortByDate: false })
      expect(p.name).toBe('default')
    })
  })

  describe('timeline instance', () => {
    it('should create a timeline with items', () => {
      const timeline = provider.createTimeline({
        items: [
          { id: '1', date: new Date('2025-01-01'), title: 'First' },
          { id: '2', date: new Date('2025-02-01'), title: 'Second' },
        ],
      })
      expect(timeline.getItems()).toHaveLength(2)
    })

    it('should sort items by date', () => {
      const timeline = provider.createTimeline({
        items: [
          { id: '2', date: new Date('2025-02-01'), title: 'Second' },
          { id: '1', date: new Date('2025-01-01'), title: 'First' },
        ],
      })
      const items = timeline.getItems()
      expect(items[0].id).toBe('1')
      expect(items[1].id).toBe('2')
    })

    it('should add items', () => {
      const timeline = provider.createTimeline({ items: [] })
      timeline.addItem({ id: '1', date: new Date(), title: 'New item' })
      expect(timeline.getItems()).toHaveLength(1)
    })

    it('should remove items by id', () => {
      const timeline = provider.createTimeline({
        items: [
          { id: '1', date: new Date(), title: 'Item 1' },
          { id: '2', date: new Date(), title: 'Item 2' },
        ],
      })
      const removed = timeline.removeItem('1')
      expect(removed).toBe(true)
      expect(timeline.getItems()).toHaveLength(1)
    })

    it('should return false when removing non-existent item', () => {
      const timeline = provider.createTimeline({ items: [] })
      expect(timeline.removeItem('nonexistent')).toBe(false)
    })

    it('should set items', () => {
      const timeline = provider.createTimeline({ items: [] })
      timeline.setItems([
        { id: '1', date: new Date(), title: 'A' },
        { id: '2', date: new Date(), title: 'B' },
      ])
      expect(timeline.getItems()).toHaveLength(2)
    })

    it('should destroy and clear items', () => {
      const timeline = provider.createTimeline({
        items: [{ id: '1', date: new Date(), title: 'A' }],
      })
      timeline.destroy()
      expect(timeline.getItems()).toHaveLength(0)
    })

    it('should not sort when sortByDate is false', () => {
      const p = createProvider({ sortByDate: false })
      const timeline = p.createTimeline({
        items: [
          { id: '2', date: new Date('2025-02-01'), title: 'Second' },
          { id: '1', date: new Date('2025-01-01'), title: 'First' },
        ],
      })
      const items = timeline.getItems()
      expect(items[0].id).toBe('2')
      expect(items[1].id).toBe('1')
    })
  })
})
