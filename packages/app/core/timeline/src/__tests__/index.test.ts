import { beforeEach, describe, expect, it } from 'vitest'

import type { TimelineInstance, TimelineItem, TimelineOptions, TimelineProvider } from '../index.js'
import { getProvider, hasProvider, requireProvider, setProvider } from '../index.js'

describe('@molecule/app-timeline', () => {
  beforeEach(() => {
    setProvider(null as unknown as TimelineProvider)
  })

  describe('Types compile correctly', () => {
    it('should compile TimelineItem type', () => {
      const item: TimelineItem = {
        id: '1',
        date: new Date('2025-01-01'),
        title: 'Project created',
        description: 'The project was initialized',
        icon: 'rocket',
        color: '#4CAF50',
        metadata: { userId: 'user-1' },
      }
      expect(item.id).toBe('1')
      expect(item.title).toBe('Project created')
    })

    it('should compile TimelineItem with minimal fields', () => {
      const item: TimelineItem = {
        id: '1',
        date: new Date(),
        title: 'Event',
      }
      expect(item.description).toBeUndefined()
    })

    it('should compile TimelineOptions type', () => {
      const options: TimelineOptions = {
        items: [],
        orientation: 'horizontal',
        alternate: true,
        onItemClick: () => {},
      }
      expect(options.orientation).toBe('horizontal')
    })

    it('should compile TimelineInstance type', () => {
      const instance: TimelineInstance = {
        setItems: () => {},
        addItem: () => {},
        removeItem: () => true,
        getItems: () => [],
        destroy: () => {},
      }
      expect(instance.getItems()).toEqual([])
    })

    it('should compile TimelineProvider type', () => {
      const provider: TimelineProvider = {
        name: 'test',
        createTimeline: () => ({
          setItems: () => {},
          addItem: () => {},
          removeItem: () => true,
          getItems: () => [],
          destroy: () => {},
        }),
      }
      expect(provider.name).toBe('test')
    })
  })

  describe('Provider management', () => {
    it('should return null when no provider is set', () => {
      expect(getProvider()).toBeNull()
    })

    it('should return false for hasProvider when none set', () => {
      expect(hasProvider()).toBe(false)
    })

    it('should throw on requireProvider when none set', () => {
      expect(() => requireProvider()).toThrow(
        'Timeline provider not configured. Bond a timeline provider first.',
      )
    })

    it('should set and get a provider', () => {
      const mockProvider: TimelineProvider = {
        name: 'test-timeline',
        createTimeline: () => ({
          setItems: () => {},
          addItem: () => {},
          removeItem: () => true,
          getItems: () => [],
          destroy: () => {},
        }),
      }
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
      expect(hasProvider()).toBe(true)
      expect(requireProvider()).toBe(mockProvider)
    })
  })

  describe('Provider operations', () => {
    it('should create a timeline instance', () => {
      const items: TimelineItem[] = [
        { id: '1', date: new Date(), title: 'Event 1' },
        { id: '2', date: new Date(), title: 'Event 2' },
      ]
      const mockInstance: TimelineInstance = {
        setItems: () => {},
        addItem: () => {},
        removeItem: () => true,
        getItems: () => items,
        destroy: () => {},
      }
      const mockProvider: TimelineProvider = {
        name: 'test',
        createTimeline: () => mockInstance,
      }
      setProvider(mockProvider)

      const timeline = requireProvider().createTimeline({ items })
      expect(timeline.getItems()).toHaveLength(2)
    })
  })
})
