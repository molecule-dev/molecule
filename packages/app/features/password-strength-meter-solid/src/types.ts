/**
 * Types for the Solid password strength meter — the Solid counterpart of
 * `@molecule/app-password-strength-meter-react`'s props, same names and same
 * behaviour.
 *
 * @module
 */

import type { PasswordScore } from './scorer.js'

/**
 * Props accepted by the {@link PasswordStrengthMeter} component.
 */
export interface PasswordStrengthMeterProps {
  /** Password value to score (controlled by the parent form). */
  password: string
  /**
   * Fires whenever the score changes — used by signup forms to gate
   * the submit button on `score >= minScore`.
   */
  onScore?: (score: PasswordScore) => void
  /** Minimum acceptable score for surrounding form validation. Default: `2`. */
  minScore?: PasswordScore
  /** Whether the textual strength label (e.g. "Strong") is shown. Default: `true`. */
  showLabel?: boolean
  /** Whether the optional rule checklist is rendered below the bar. Default: `false`. */
  showChecklist?: boolean
  /** Extra classes appended to the outer wrapper. */
  className?: string
}
