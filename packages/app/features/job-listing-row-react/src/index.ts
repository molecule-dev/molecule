/**
 * Job-board listing row — title + company + location + employment type +
 * salary + posted date, with optional leading logo, tag chips, and
 * right-side actions.
 *
 * Exports `<JobListingRow>`. Props: `title`, `company?`, `location?`, `type?`,
 * `salary?`, `postedAt?`, `leading?`, `tags?`, `actions?`, `onClick?`, `className?`.
 * All display props accept ReactNode, so formatting (dates, currency) is the
 * caller's job.
 *
 * @remarks
 * - The location value is prefixed with a hardcoded 📍 glyph and the meta fields
 *   are joined with literal middle-dot separators; there is no prop to change or
 *   localise those separators.
 * - `onClick` makes the whole row clickable through a transparent native button
 *   over it (the row is named by the title — the `<h3>` itself takes the id the
 *   button points at with `aria-labelledby`); the inner controls sit above it
 *   and keep their own clicks. Put a real link or button in `actions` for the
 *   other row actions.
 * - No `data-mol-id` prop is currently supported on this component.
 * - Styling resolves through `getClassMap()` — a ClassMap bond must be wired.
 *
 * @example
 * ```tsx
 * import { JobListingRow } from '@molecule/app-job-listing-row-react'
 *
 * <JobListingRow
 *   title="Senior Frontend Engineer"
 *   company="Acme Corp"
 *   location="Remote · US"
 *   type="Full-time"
 *   salary="$130k–$160k"
 *   postedAt="2 days ago"
 *   onClick={() => { window.location.href = '/jobs/123' }}
 * />
 * ```
 * @module
 */

export * from './JobListingRow.js'
