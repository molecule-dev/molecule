/**
 * Shepherd.js-compatible tour provider implementation.
 *
 * @module
 */

import type { TourInstance, TourOptions, TourProvider } from '@molecule/app-tour'

import type { ShepherdConfig } from './types.js'

/**
 * Creates a Shepherd-based tour provider.
 *
 * @param _config - Optional provider configuration.
 * @returns A configured TourProvider.
 */
export function createProvider(_config?: ShepherdConfig): TourProvider {
  return {
    name: 'shepherd',

    createTour(options: TourOptions): TourInstance {
      let active = false
      let currentStep = 0
      const steps = options.steps

      return {
        start(): void {
          active = true
          currentStep = 0
          const step = steps[currentStep]
          step?.action?.()
        },

        next(): void {
          if (!active || currentStep >= steps.length - 1) return
          currentStep++
          const step = steps[currentStep]
          step?.action?.()
        },

        previous(): void {
          if (!active || currentStep <= 0) return
          currentStep--
          const step = steps[currentStep]
          step?.action?.()
        },

        cancel(): void {
          active = false
          options.onCancel?.()
        },

        complete(): void {
          active = false
          options.onComplete?.()
        },

        isActive(): boolean {
          return active
        },

        getCurrentStep(): number {
          return currentStep
        },
      }
    },
  }
}

/** Default Shepherd tour provider instance. */
export const provider: TourProvider = createProvider()
