/**
 * Types for the Solid multi-step onboarding overlay.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/**
 * A single step in an onboarding flow, with a title, body, and optional media.
 * Node-valued fields take a Solid JSX value (or a plain string) instead of a
 * React node; the conformance kit supplies them as accessors, which Solid's
 * JSX renders where they are inserted.
 */
export interface OnboardingStep {
  /** Stable identity, used as the step dot's key. */
  id: string
  /** Step heading. */
  title: JSX.Element
  /** Step body. */
  body: JSX.Element
  /** Optional media / illustration. */
  media?: JSX.Element
}

/** Props accepted by the {@link OnboardingModal} component. */
export interface OnboardingModalProps {
  /** Whether the modal is open. */
  open: boolean
  /** Called when closing (skip / X / completion). React passes the click event for Skip and the chrome close button. */
  onClose?: (event?: unknown) => void
  /** Onboarding steps. */
  steps: OnboardingStep[]
  /** Called when the user clicks "Done" on the last step. */
  onComplete?: () => void
  /** Show "Skip" link in the footer. Defaults to true. */
  allowSkip?: boolean
  /** Initial step index (uncontrolled). */
  defaultStep?: number
}
