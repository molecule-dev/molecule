import { describe, expect, it, vi } from 'vitest'

import type { StepperProvider } from '@molecule/app-stepper'

import { createProvider, provider } from '../index.js'

describe('@molecule/app-stepper-default', () => {
  describe('provider', () => {
    it('should export a default provider instance', () => {
      expect(provider).toBeDefined()
      expect(provider.name).toBe('default')
    })

    it('should conform to StepperProvider interface', () => {
      const p: StepperProvider = provider
      expect(typeof p.createStepper).toBe('function')
    })
  })

  describe('createProvider', () => {
    it('should create a provider with default config', () => {
      const p = createProvider()
      expect(p.name).toBe('default')
    })
  })

  describe('stepper instance', () => {
    it('should create with initial active step', () => {
      const stepper = provider.createStepper({
        steps: [{ label: 'A' }, { label: 'B' }, { label: 'C' }],
        activeStep: 1,
      })
      expect(stepper.getActiveStep()).toBe(1)
    })

    it('should default to step 0', () => {
      const stepper = provider.createStepper({
        steps: [{ label: 'A' }, { label: 'B' }],
      })
      expect(stepper.getActiveStep()).toBe(0)
    })

    it('should navigate next', () => {
      const stepper = provider.createStepper({
        steps: [{ label: 'A' }, { label: 'B' }, { label: 'C' }],
      })
      stepper.next()
      expect(stepper.getActiveStep()).toBe(1)
      stepper.next()
      expect(stepper.getActiveStep()).toBe(2)
    })

    it('should not go past last step', () => {
      const stepper = provider.createStepper({
        steps: [{ label: 'A' }, { label: 'B' }],
      })
      stepper.next()
      stepper.next()
      expect(stepper.getActiveStep()).toBe(1)
    })

    it('should navigate previous', () => {
      const stepper = provider.createStepper({
        steps: [{ label: 'A' }, { label: 'B' }],
        activeStep: 1,
      })
      stepper.previous()
      expect(stepper.getActiveStep()).toBe(0)
    })

    it('should not go before first step', () => {
      const stepper = provider.createStepper({
        steps: [{ label: 'A' }, { label: 'B' }],
      })
      stepper.previous()
      expect(stepper.getActiveStep()).toBe(0)
    })

    it('should go to specific step', () => {
      const stepper = provider.createStepper({
        steps: [{ label: 'A' }, { label: 'B' }, { label: 'C' }],
      })
      stepper.goTo(2)
      expect(stepper.getActiveStep()).toBe(2)
    })

    it('should call onStepChange callback', () => {
      const onChange = vi.fn()
      const stepper = provider.createStepper({
        steps: [{ label: 'A' }, { label: 'B' }],
        onStepChange: onChange,
      })
      stepper.next()
      expect(onChange).toHaveBeenCalledWith(1)
    })

    it('should check completion', () => {
      const stepper = provider.createStepper({
        steps: [
          { label: 'A', completed: true },
          { label: 'B', completed: true },
        ],
      })
      expect(stepper.isComplete()).toBe(true)
    })

    it('should not be complete with uncompleted steps', () => {
      const stepper = provider.createStepper({
        steps: [
          { label: 'A', completed: true },
          { label: 'B', completed: false },
        ],
      })
      expect(stepper.isComplete()).toBe(false)
    })

    it('should treat optional steps as not blocking completion', () => {
      const stepper = provider.createStepper({
        steps: [
          { label: 'A', completed: true },
          { label: 'B', optional: true },
        ],
      })
      expect(stepper.isComplete()).toBe(true)
    })

    it('should validate current step', () => {
      const stepper = provider.createStepper({
        steps: [{ label: 'A' }],
      })
      expect(stepper.validate()).toBe(true)
    })

    it('should fail validation when step has error', () => {
      const stepper = provider.createStepper({
        steps: [{ label: 'A', error: 'Required field missing' }],
      })
      expect(stepper.validate()).toBe(false)
    })

    it('should enforce linear mode', () => {
      const stepper = provider.createStepper({
        steps: [{ label: 'A', completed: false }, { label: 'B' }, { label: 'C' }],
        linear: true,
      })
      stepper.next()
      expect(stepper.getActiveStep()).toBe(0)
    })

    it('should allow next in linear mode when step is completed', () => {
      const stepper = provider.createStepper({
        steps: [{ label: 'A', completed: true }, { label: 'B' }],
        linear: true,
      })
      stepper.next()
      expect(stepper.getActiveStep()).toBe(1)
    })

    it('should allow skipping optional steps in linear mode', () => {
      const stepper = provider.createStepper({
        steps: [{ label: 'A', optional: true }, { label: 'B' }],
        linear: true,
      })
      stepper.next()
      expect(stepper.getActiveStep()).toBe(1)
    })
  })
})
