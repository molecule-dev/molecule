/**
 * Types of `@molecule/app-medication-row-solid` — the Solid counterpart of
 * `@molecule/app-medication-row-react`, same props and DOM.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Props for the {@link MedicationRow} component. */
export interface MedicationRowProps {
  /** Drug name. */
  name: JSX.Element
  /** Dosage display ("10mg", "1 tablet"). */
  dosage?: JSX.Element
  /** Form (tablet, capsule, liquid, etc.). */
  form?: JSX.Element
  /** Optional accent color (typically used to differentiate pill colors). */
  color?: string
  /** Instructions text ("Take with food"). */
  instructions?: JSX.Element
  /** Prescriber display. */
  prescriber?: JSX.Element
  /** Days of supply remaining. */
  supplyDays?: number
  /** Refills remaining. */
  refills?: number
  /** Right-side actions (Mark taken, Refill, Edit). */
  actions?: JSX.Element
  /** Extra classes. */
  className?: string
}
