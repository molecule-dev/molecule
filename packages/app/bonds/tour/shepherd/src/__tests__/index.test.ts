import { describe, expect, it, vi } from 'vitest'

import type { TourProvider } from '@molecule/app-tour'

import { createProvider, provider } from '../index.js'

describe('@molecule/app-tour-shepherd', () => {
  describe('provider', () => {
    it('should export a default provider instance', () => {
      expect(provider).toBeDefined()
      expect(provider.name).toBe('shepherd')
    })

    it('should conform to TourProvider interface', () => {
      const p: TourProvider = provider
      expect(typeof p.createTour).toBe('function')
    })
  })

  describe('createProvider', () => {
    it('should create a provider with default config', () => {
      const p = createProvider()
      expect(p.name).toBe('shepherd')
    })

    it('should create a provider with custom config', () => {
      const p = createProvider({ overlay: false, showButtons: false })
      expect(p.name).toBe('shepherd')
    })
  })

  describe('tour instance', () => {
    it('should start a tour', () => {
      const tour = provider.createTour({
        steps: [{ target: '#step1', title: 'Step 1', content: 'First step' }],
      })
      expect(tour.isActive()).toBe(false)
      tour.start()
      expect(tour.isActive()).toBe(true)
      expect(tour.getCurrentStep()).toBe(0)
    })

    it('should navigate forward', () => {
      const tour = provider.createTour({
        steps: [
          { target: '#a', title: 'A', content: 'First' },
          { target: '#b', title: 'B', content: 'Second' },
          { target: '#c', title: 'C', content: 'Third' },
        ],
      })
      tour.start()
      tour.next()
      expect(tour.getCurrentStep()).toBe(1)
      tour.next()
      expect(tour.getCurrentStep()).toBe(2)
    })

    it('should not go past last step', () => {
      const tour = provider.createTour({
        steps: [
          { target: '#a', title: 'A', content: 'First' },
          { target: '#b', title: 'B', content: 'Second' },
        ],
      })
      tour.start()
      tour.next()
      tour.next()
      expect(tour.getCurrentStep()).toBe(1)
    })

    it('should navigate backward', () => {
      const tour = provider.createTour({
        steps: [
          { target: '#a', title: 'A', content: 'First' },
          { target: '#b', title: 'B', content: 'Second' },
        ],
      })
      tour.start()
      tour.next()
      tour.previous()
      expect(tour.getCurrentStep()).toBe(0)
    })

    it('should not go before first step', () => {
      const tour = provider.createTour({
        steps: [{ target: '#a', title: 'A', content: 'First' }],
      })
      tour.start()
      tour.previous()
      expect(tour.getCurrentStep()).toBe(0)
    })

    it('should cancel a tour', () => {
      const onCancel = vi.fn()
      const tour = provider.createTour({
        steps: [{ target: '#a', title: 'A', content: 'First' }],
        onCancel,
      })
      tour.start()
      tour.cancel()
      expect(tour.isActive()).toBe(false)
      expect(onCancel).toHaveBeenCalled()
    })

    it('should complete a tour', () => {
      const onComplete = vi.fn()
      const tour = provider.createTour({
        steps: [{ target: '#a', title: 'A', content: 'First' }],
        onComplete,
      })
      tour.start()
      tour.complete()
      expect(tour.isActive()).toBe(false)
      expect(onComplete).toHaveBeenCalled()
    })

    it('should call step action on start', () => {
      const action = vi.fn()
      const tour = provider.createTour({
        steps: [{ target: '#a', title: 'A', content: 'First', action }],
      })
      tour.start()
      expect(action).toHaveBeenCalled()
    })

    it('should call step action on navigate', () => {
      const action1 = vi.fn()
      const action2 = vi.fn()
      const tour = provider.createTour({
        steps: [
          { target: '#a', title: 'A', content: 'First', action: action1 },
          { target: '#b', title: 'B', content: 'Second', action: action2 },
        ],
      })
      tour.start()
      tour.next()
      expect(action2).toHaveBeenCalled()
    })

    it('should not navigate when not active', () => {
      const tour = provider.createTour({
        steps: [
          { target: '#a', title: 'A', content: 'First' },
          { target: '#b', title: 'B', content: 'Second' },
        ],
      })
      tour.next()
      expect(tour.getCurrentStep()).toBe(0)
    })
  })
})
