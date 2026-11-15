/**
 * Types of `@molecule/app-medication-row-angular` — the Angular counterpart of
 * `@molecule/app-medication-row-react`, same props and DOM.
 *
 * @module
 */

/**
 * Props accepted by {@link MedicationRow} — the same props
 * `@molecule/app-medication-row-react` accepts. Node props (`name`, `dosage`,
 * `form`, `instructions`, `prescriber`, `actions`) are projected content in
 * Angular (an input cannot carry a node), so they are typed `unknown`: pass
 * node content as `[slot=<name>]` children of the host element, and plain
 * strings as the input.
 */
export interface MedicationRowProps {
  /** Drug name — a string input, or `[slot=name]` projected content. */
  name?: unknown
  /** Dosage display ("10mg", "1 tablet") — a string input, or `[slot=dosage]` content. */
  dosage?: unknown
  /** Form (tablet, capsule, liquid, etc.) — a string input, or `[slot=form]` content. */
  form?: unknown
  /** Optional accent color (typically used to differentiate pill colors). */
  color?: string
  /** Instructions text ("Take with food") — a string input, or `[slot=instructions]` content. */
  instructions?: unknown
  /** Prescriber display — a string input, or `[slot=prescriber]` content. */
  prescriber?: unknown
  /** Days of supply remaining. */
  supplyDays?: number
  /** Refills remaining. */
  refills?: number
  /** Right-side actions — a string input, or `[slot=actions]` content. */
  actions?: unknown
  /** Extra classes. */
  className?: string
}
