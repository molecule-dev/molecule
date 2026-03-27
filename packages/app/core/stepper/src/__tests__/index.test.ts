import { beforeEach, describe, expect, it } from 'vitest'

import type { Step, StepperInstance, StepperOptions, StepperProvider } from '../index.js'
import { getProvider, hasProvider, requireProvider, setProvider } from '../index.js'

describe('@molecule/app-stepper', () => {
  beforeEach(() => {
    setProvider(null as unknown as StepperProvider)
  })

  describe('Types compile correctly', () => {
    it('should compile Step type', () => {
      const step: Step = {
        label: 'Account Setup',
        description: 'Create your account',
        icon: 'user',
        optional: false,
        error: undefined,
        completed: true,
      }
      expect(step.label).toBe('Account Setup')
    })

    it('should compile Step with minimal fields', () => {
      const step: Step = { label: 'Step 1' }
      expect(step.optional).toBeUndefined()
    })

    it('should compile StepperOptions type', () => {
      const options: StepperOptions = {
        steps: [{ label: 'Step 1' }, { label: 'Step 2' }],
        activeStep: 0,
        orientation: 'vertical',
        onStepChange: () => {},
        linear: true,
      }
      expect(options.steps).toHaveLength(2)
    })

    it('should compile StepperInstance type', () => {
      const instance: StepperInstance = {
        next: () => {},
        previous: () => {},
        goTo: () => {},
        getActiveStep: () => 0,
        isComplete: () => false,
        validate: () => true,
        destroy: () => {},
      }
      expect(instance.getActiveStep()).toBe(0)
    })

    it('should compile StepperProvider type', () => {
      const provider: StepperProvider = {
        name: 'test',
        createStepper: () => ({
          next: () => {},
          previous: () => {},
          goTo: () => {},
          getActiveStep: () => 0,
          isComplete: () => false,
          validate: () => true,
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
        'Stepper provider not configured. Bond a stepper provider first.',
      )
    })

    it('should set and get a provider', () => {
      const mockProvider: StepperProvider = {
        name: 'test-stepper',
        createStepper: () => ({
          next: () => {},
          previous: () => {},
          goTo: () => {},
          getActiveStep: () => 0,
          isComplete: () => false,
          validate: () => true,
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
    it('should create a stepper instance', () => {
      const mockInstance: StepperInstance = {
        next: () => {},
        previous: () => {},
        goTo: () => {},
        getActiveStep: () => 1,
        isComplete: () => false,
        validate: () => true,
        destroy: () => {},
      }
      const mockProvider: StepperProvider = {
        name: 'test',
        createStepper: () => mockInstance,
      }
      setProvider(mockProvider)

      const stepper = requireProvider().createStepper({
        steps: [{ label: 'A' }, { label: 'B' }, { label: 'C' }],
      })
      expect(stepper.getActiveStep()).toBe(1)
      expect(stepper.isComplete()).toBe(false)
    })
  })
})
