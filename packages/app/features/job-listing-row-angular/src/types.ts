/**
 * Types of `@molecule/app-job-listing-row-angular` — the Angular counterpart
 * of `@molecule/app-job-listing-row-react`, same props and DOM.
 *
 * @module
 */

/**
 * Props for {@link JobListingRow} — the same props
 * `@molecule/app-job-listing-row-react` accepts. Node-valued props (`title`,
 * `company`, `location`, `type`, `salary`, `postedAt`, `leading`, `actions`,
 * `tags`) are projected content in Angular (an input cannot carry a node):
 * pass a string value through the input, and element content in the host
 * template as `[slot=<name>]` content.
 */
export interface JobListingRowProps {
  /** Title of the role; element content is projected as `[slot=title]` content. */
  title?: unknown
  /** Company / employer display; projected as `[slot=company]` content. */
  company?: unknown
  /** Location string; projected as `[slot=location]` content. */
  location?: unknown
  /** Employment type; projected as `[slot=type]` content. */
  type?: unknown
  /** Salary range display; projected as `[slot=salary]` content. */
  salary?: unknown
  /** Posted-at display; projected as `[slot=postedAt]` content. */
  postedAt?: unknown
  /** Optional company logo / icon, projected as `[slot=leading]` content. */
  leading?: unknown
  /** Optional right-side actions, projected as `[slot=actions]` content. */
  actions?: unknown
  /** Tags / chips, projected as `[slot=tags]` content. */
  tags?: unknown
  /** Click handler; receives the DOM click event. */
  onClick?: (event: Event) => void
  /** Extra classes. */
  className?: string
}
