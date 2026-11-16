/**
 * Types for the Vue job-board listing row.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/** Props for {@link JobListingRow}. */
export interface JobListingRowProps {
  /** Title of the role. */
  title: VNodeChild
  /** Company / employer display. */
  company?: VNodeChild
  /** Location string ("Remote · US" / "London, UK"). */
  location?: VNodeChild
  /** Employment type ("Full-time", "Contract", "Internship"). */
  type?: VNodeChild
  /** Salary range display ("$80k–$120k"). */
  salary?: VNodeChild
  /** Posted-at relative or absolute display. */
  postedAt?: VNodeChild
  /** Optional company logo / icon. */
  leading?: VNodeChild
  /** Optional right-side actions (Save, Apply). */
  actions?: VNodeChild
  /** Tags / chips (Remote, React, Hybrid). */
  tags?: VNodeChild
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
