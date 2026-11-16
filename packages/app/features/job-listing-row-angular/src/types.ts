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
