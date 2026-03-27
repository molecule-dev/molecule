import { beforeEach, describe, expect, it } from 'vitest'

import type { TourInstance, TourOptions, TourProvider, TourStep } from '../index.js'
import { getProvider, hasProvider, requireProvider, setProvider } from '../index.js'

describe('@molecule/app-tour', () => {
  beforeEach(() => {
    setProvider(null as unknown as TourProvider)
  })

  describe('Types compile correctly', () => {
    it('should compile TourStep type', () => {
      const step: TourStep = {
        target: '#welcome',
        title: 'Welcome',
        content: 'This is the welcome area',
        placement: 'bottom',
        action: () => {},
        beforeShow: async () => {},
      }
      expect(step.target).toBe('#welcome')
    })

    it('should compile TourStep with minimal fields', () => {
      const step: TourStep = {
        target: '.btn',
        title: 'Click here',
        content: 'Press this button',
      }
      expect(step.placement).toBeUndefined()
    })

    it('should compile TourOptions type', () => {
      const options: TourOptions = {
        steps: [{ target: '#a', title: 'A', content: 'Step A' }],
        onComplete: () => {},
        onCancel: () => {},
        showProgress: true,
        showButtons: true,
        overlay: true,
      }
      expect(options.steps).toHaveLength(1)
    })

    it('should compile TourInstance type', () => {
      const instance: TourInstance = {
        start: () => {},
        next: () => {},
        previous: () => {},
        cancel: () => {},
        complete: () => {},
        isActive: () => false,
        getCurrentStep: () => 0,
      }
      expect(instance.isActive()).toBe(false)
    })

    it('should compile TourProvider type', () => {
      const provider: TourProvider = {
        name: 'test',
        createTour: () => ({
          start: () => {},
          next: () => {},
          previous: () => {},
          cancel: () => {},
          complete: () => {},
          isActive: () => false,
          getCurrentStep: () => 0,
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
        'Tour provider not configured. Bond a tour provider first.',
      )
    })

    it('should set and get a provider', () => {
      const mockProvider: TourProvider = {
        name: 'test-tour',
        createTour: () => ({
          start: () => {},
          next: () => {},
          previous: () => {},
          cancel: () => {},
          complete: () => {},
          isActive: () => false,
          getCurrentStep: () => 0,
        }),
      }
      setProvider(mockProvider)
      expect(getProvider()).toBe(mockProvider)
      expect(hasProvider()).toBe(true)
      expect(requireProvider()).toBe(mockProvider)
    })
  })

  describe('Provider operations', () => {
    it('should create a tour instance', () => {
      const mockInstance: TourInstance = {
        start: () => {},
        next: () => {},
        previous: () => {},
        cancel: () => {},
        complete: () => {},
        isActive: () => true,
        getCurrentStep: () => 0,
      }
      const mockProvider: TourProvider = {
        name: 'test',
        createTour: () => mockInstance,
      }
      setProvider(mockProvider)

      const tour = requireProvider().createTour({
        steps: [{ target: '#a', title: 'A', content: 'First step' }],
      })
      expect(tour.isActive()).toBe(true)
      expect(tour.getCurrentStep()).toBe(0)
    })
  })
})
