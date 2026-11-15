/**
 * Types of `@molecule/app-medication-row-svelte` — the Svelte counterpart of
 * `@molecule/app-medication-row-react`, same props and DOM.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** Props for the {@link MedicationRow} component. */
export interface MedicationRowProps {
  /** Drug name — a snippet or a plain string. */
  name?: Snippet | string
  /** Dosage display ("10mg", "1 tablet") — a snippet or a plain string. */
  dosage?: Snippet | string
  /** Form (tablet, capsule, liquid, etc.) — a snippet or a plain string. */
  form?: Snippet | string
  /** Optional accent color (typically used to differentiate pill colors). */
  color?: string
  /** Instructions text ("Take with food") — a snippet or a plain string. */
  instructions?: Snippet | string
  /** Prescriber display — a snippet or a plain string. */
  prescriber?: Snippet | string
  /** Days of supply remaining. */
  supplyDays?: number
  /** Refills remaining. */
  refills?: number
  /** Right-side actions (Mark taken, Refill, Edit) — a snippet. */
  actions?: Snippet
  /** Extra classes. */
  className?: string
}
