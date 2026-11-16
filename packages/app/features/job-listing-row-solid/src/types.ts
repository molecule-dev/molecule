/**
 * Types for the Solid job-board listing row.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** Props for {@link JobListingRow}. */
export interface JobListingRowProps {
  /** Title of the role. */
  title: JSX.Element
  /** Company / employer display. */
  company?: JSX.Element
  /** Location string ("Remote · US" / "London, UK"). */
  location?: JSX.Element
  /** Employment type ("Full-time", "Contract", "Internship"). */
  type?: JSX.Element
  /** Salary range display ("$80k–$120k"). */
  salary?: JSX.Element
  /** Posted-at relative or absolute display. */
  postedAt?: JSX.Element
  /** Optional company logo / icon. */
  leading?: JSX.Element
  /** Optional right-side actions (Save, Apply). */
  actions?: JSX.Element
  /** Tags / chips (Remote, React, Hybrid). */
  tags?: JSX.Element
  /**
   * Activates the row: while it is set, an empty, transparent native button
   * covers the whole row and calls this on click — the whole row is the click
   * target, and Enter / Space activate the button natively. The row is named
   * by the title (the `<h3>` itself takes the id the button points at with
   * `aria-labelledby`); the `actions` and `tags` slots sit above the button
   * and keep their own clicks.
   */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}
