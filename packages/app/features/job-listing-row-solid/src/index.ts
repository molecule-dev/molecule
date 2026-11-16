/**
 * Solid job-board listing row.
 *
 * Exports `JobListingRow` — title + company + location + employment type +
 * salary + posted date, with optional leading logo, tag chips, and
 * right-side actions. It is the Solid counterpart of
 * `@molecule/app-job-listing-row-react`: the same props (React names) and the
 * same DOM for the same input.
 *
 * @example
 * ```tsx
 * import { JobListingRow } from '@molecule/app-job-listing-row-solid'
 *
 * declare function openJob(): void
 *
 * <JobListingRow
 *   title="Senior Frontend Engineer"
 *   company="Acme Corp"
 *   location="Remote · US"
 *   type="Full-time"
 *   salary="$130k–$160k"
 *   postedAt="2 days ago"
 *   onClick={openJob}
 * />
 * ```
 *
 * @remarks
 * Requires a wired ClassMap bond — `getClassMap()` throws before wiring.
 *
 * The location value is prefixed with a hardcoded 📍 glyph and the meta
 * fields are joined with literal middle-dot separators; there is no prop to
 * change or localise those separators.
 *
 * `onClick` makes the whole row clickable through a transparent native button
 * over it — the row is named by the title (the `<h3>` itself takes the id the
 * button points at with `aria-labelledby`), and the inner controls sit above
 * it and keep their own clicks. Put a real link or button in `actions` for the
 * other row actions.
 *
 * @module
 */

export * from './JobListingRow.jsx'
export * from './types.js'
