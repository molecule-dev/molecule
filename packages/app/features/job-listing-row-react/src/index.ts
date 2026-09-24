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
 * - It does NOT format anything: `salary` and `postedAt` are rendered as given —
 *   pass strings you formatted (currency, dates) yourself, not numbers or `Date`s.
 *   It does not navigate either; `onClick` is yours (e.g. `useNavigate()`).
 * - The location value is prefixed with a hardcoded 📍 glyph and the meta fields
 *   are joined with literal middle-dot separators; there is no prop to change or
 *   localise those separators.
 * - `onClick` makes the whole row clickable but the root is a plain `<div>` with no
 *   `role`, `tabIndex`, or keyboard handler — keyboard users can only reach whatever
 *   you pass in `actions`. Put a real link or button in `actions` when the row is
 *   the primary navigation affordance.
 * - No `data-mol-id` prop is currently supported on this component. A click inside
 *   `actions` also bubbles to the row's `onClick`.
 * - Styling resolves through `getClassMap()` — a ClassMap bond must be wired.
 *
 * @example
 * ```tsx
 * import { Link, useNavigate } from 'react-router'
 *
 * import { JobListingRow } from '@molecule/app-job-listing-row-react'
 * import { useTranslation } from '@molecule/app-react'
 *
 * export function JobList() {
 *   const { t } = useTranslation()
 *   const navigate = useNavigate()
 *   const jobs = [
 *     { id: 'j1', title: 'Senior Frontend Engineer', company: 'Acme Corp', location: 'Remote (US)', type: 'Full-time', salaryMin: 130000, salaryMax: 160000, postedAt: '2026-09-20' },
 *     { id: 'j2', title: 'Data Analyst', company: 'Globex', location: 'London, UK', type: 'Contract', salaryMin: 60000, salaryMax: 75000, postedAt: '2026-09-18' },
 *   ]
 *   const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', notation: 'compact' })
 *   return (
 *     <section>
 *       {jobs.map((job) => (
 *         <JobListingRow
 *           key={job.id}
 *           title={job.title}
 *           company={job.company}
 *           location={job.location}
 *           type={job.type}
 *           salary={`${money(job.salaryMin)}–${money(job.salaryMax)}`}
 *           postedAt={new Date(job.postedAt).toLocaleDateString('en-US', { dateStyle: 'medium', timeZone: 'UTC' })}
 *           onClick={() => navigate(`/jobs/${job.id}`)}
 *           actions={<Link to={`/jobs/${job.id}`}>{t('common.open', undefined, { defaultValue: 'Open' })}</Link>}
 *         />
 *       ))}
 *     </section>
 *   )
 * }
 * ```
 *
 * @module
 */

export * from './JobListingRow.js'
