/**
 * Types of `@molecule/app-onboarding-modal-angular` — the Angular counterpart
 * of `@molecule/app-onboarding-modal-react`, same props and DOM.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/**
 * A single step in an onboarding flow, with a title, body, and optional media.
 * Node-valued fields arrive as a template (the conformance kit's data-prop node
 * value), or as plain text.
 */
export interface OnboardingStep {
  /** Stable identity, used as the step dot's key. */
  id: string
  /** Step heading: text, or a template. */
  title: string | TemplateRef<unknown>
  /** Step body: text, or a template. */
  body: string | TemplateRef<unknown>
  /** Optional media / illustration: text, or a template. */
  media?: string | TemplateRef<unknown>
}

/** Props accepted by {@link OnboardingModal} — the same props `@molecule/app-onboarding-modal-react` accepts. */
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
