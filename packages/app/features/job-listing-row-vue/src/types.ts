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
  /** Click handler on the row. */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}
