/**
 * Types for the Solid multi-step progress indicator.
 *
 * The Solid counterpart of `@molecule/app-stepper-react`'s types — the same
 * props (React names), with node values typed as Solid JSX.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Possible visual/semantic states for a single stepper step. */
export type StepStatus = 'completed' | 'current' | 'pending' | 'error'

/** Descriptor for a single step rendered inside a Stepper. */
export interface StepperStep {
  /** Step id. */
  id: string
  /** Step label. A string or JSX, as React accepts a ReactNode. */
  label: JSX.Element
  /** Optional description. */
  description?: JSX.Element
  /** Explicit status — when omitted, derived from `currentStep`. */
  status?: StepStatus
}

/** Props for the {@link Stepper} component. */
export interface StepperProps {
  /** Steps to render. */
  steps: StepperStep[]
  /** Index of the current step (0-based). */
  currentStep: number
  /** Visual variant. Defaults to `'dots'`. */
  variant?: 'dots' | 'bar' | 'cards'
  /** Layout orientation. Defaults to `'horizontal'`. */
  orientation?: 'horizontal' | 'vertical'
  /**
   * Optional navigation click handler. Variant-dependent: in `cards` it
   * fires only for completed steps (others render disabled); in `dots`
   * it fires for ANY step — guard inside the handler if backward-only
   * navigation is required. The `bar` variant is not clickable.
   */
  onStepClick?: (stepId: string, index: number) => void
  /** Extra classes. */
  className?: string
}
