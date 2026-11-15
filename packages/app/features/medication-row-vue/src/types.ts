/**
 * Types for the Vue medication record row.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Props for the {@link MedicationRow} component. */
export interface MedicationRowProps {
  /**
   * Drug name. A string renders as text; a node is passed as a prop or as
   * the same-named slot — both work.
   */
  name?: VNodeChild
  /** Dosage display ("10mg", "1 tablet") — a prop or the same-named slot. */
  dosage?: VNodeChild
  /** Form (tablet, capsule, liquid, etc.) — a prop or the same-named slot. */
  form?: VNodeChild
  /** Optional accent color (typically used to differentiate pill colors). */
  color?: string
  /** Instructions text ("Take with food") — a prop or the same-named slot. */
  instructions?: VNodeChild
  /** Prescriber display — a prop or the same-named slot. */
  prescriber?: VNodeChild
  /** Days of supply remaining. */
  supplyDays?: number
  /** Refills remaining. */
  refills?: number
  /** Right-side actions (Mark taken, Refill, Edit) — a prop or the same-named slot. */
  actions?: VNodeChild
  /** Extra classes. */
  className?: string
}
