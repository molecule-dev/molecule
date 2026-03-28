/**
 * Default stepper provider implementation.
 *
 * @module
 */

import type { StepperInstance, StepperOptions, StepperProvider } from '@molecule/app-stepper'

import type { DefaultStepperConfig } from './types.js'

/**
 * Creates a default stepper provider.
 *
 * @param _config - Optional provider configuration.
 * @returns A configured StepperProvider.
 */
export function createProvider(_config?: DefaultStepperConfig): StepperProvider {
  return {
    name: 'default',

    createStepper(options: StepperOptions): StepperInstance {
      const steps = [...options.steps]
      let activeStep = options.activeStep ?? 0
      const linear = options.linear ?? false

      return {
        next(): void {
          if (activeStep < steps.length - 1) {
            if (linear && !steps[activeStep].completed && !steps[activeStep].optional) {
              return
            }
            activeStep++
            options.onStepChange?.(activeStep)
          }
        },

        previous(): void {
          if (activeStep > 0) {
            activeStep--
            options.onStepChange?.(activeStep)
          }
        },

        goTo(step: number): void {
          if (step >= 0 && step < steps.length) {
            if (linear) {
              for (let i = 0; i < step; i++) {
                if (!steps[i].completed && !steps[i].optional) {
                  return
                }
              }
            }
            activeStep = step
            options.onStepChange?.(activeStep)
          }
        },

        getActiveStep(): number {
          return activeStep
        },

        isComplete(): boolean {
          return steps.every((step) => step.completed || step.optional)
        },

        validate(): boolean {
          const current = steps[activeStep]
          return !current.error
        },

        destroy(): void {
          // No resources to clean up
        },
      }
    },
  }
}

/** Default stepper provider instance. */
export const provider: StepperProvider = createProvider()
