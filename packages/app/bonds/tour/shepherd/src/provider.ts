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
 * @param config - Optional provider-level defaults for the resolved
 *   `overlay` / `showButtons` UI flags.
 * @returns A configured TourProvider.
 */
export function createProvider(config: ShepherdConfig = {}): TourProvider {
  return {
    name: 'shepherd',

    createTour(options: TourOptions): TourInstance {
      let active = false
      let currentStep = 0
      const steps = options.steps
      // Resolve the UI-intent flags the consumer reads back off the instance:
      // per-tour option → provider-level default → `true`. The provider itself
      // renders nothing; these flags tell the consumer's render code whether to
      // paint the backdrop / nav buttons.
      const overlay = options.overlay ?? config.overlay ?? true
      const showButtons = options.showButtons ?? config.showButtons ?? true

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

        hasOverlay(): boolean {
          return overlay
        },

        hasButtons(): boolean {
          return showButtons
        },
      }
    },
  }
}

/** Default Shepherd tour provider instance. */
export const provider: TourProvider = createProvider()
