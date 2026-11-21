/**
 * Types of `@molecule/app-stepper-angular` — the Angular counterpart of
 * `@molecule/app-stepper-react`, same props and DOM.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/** Possible visual/semantic states for a single stepper step. */
export type StepStatus = 'completed' | 'current' | 'pending' | 'error'

/**
 * Descriptor for a single step rendered inside a Stepper. Node-valued
 * `label`/`description` arrive as a template (the conformance kit's data-prop
 * node value), or as plain text.
 */
export interface StepperStep {
  /** Step id. */
  id: string
  /** Step label: text, or a template. */
  label: string | TemplateRef<unknown>
  /** Optional description: text, or a template. */
  description?: string | TemplateRef<unknown>
  /** Explicit status — when omitted, derived from `currentStep`. */
  status?: StepStatus
}

/**
 * Props accepted by {@link Stepper} — the same props
 * `@molecule/app-stepper-react` accepts.
 */
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
