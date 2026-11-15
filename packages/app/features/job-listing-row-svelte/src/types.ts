/**
 * Types for the Svelte job-board listing row.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** Props for {@link JobListingRow}. */
export interface JobListingRowProps {
  /**
   * Title of the role. A string renders as text; a node arrives as a
   * same-named snippet.
   */
  title: Snippet | string
  /** Company / employer display; a node arrives as a snippet. */
  company?: Snippet | string
  /** Location string ("Remote · US" / "London, UK"); a node arrives as a snippet. */
  location?: Snippet | string
  /** Employment type ("Full-time", "Contract", "Internship"); a node arrives as a snippet. */
  type?: Snippet | string
  /** Salary range display ("$80k–$120k"); a node arrives as a snippet. */
  salary?: Snippet | string
  /** Posted-at relative or absolute display; a node arrives as a snippet. */
  postedAt?: Snippet | string
  /** Optional company logo / icon; arrives as a snippet. */
  leading?: Snippet | string
  /** Optional right-side actions (Save, Apply); arrive as a snippet. */
  actions?: Snippet | string
  /** Tags / chips (Remote, React, Hybrid); arrive as a snippet. */
  tags?: Snippet | string
  /** Click handler on the row. */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}
