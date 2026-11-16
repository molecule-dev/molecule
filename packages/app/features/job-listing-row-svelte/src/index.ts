/**
 * Svelte job-board listing row — the Svelte counterpart of
 * `@molecule/app-job-listing-row-react`, with the same props and the same
 * DOM.
 *
 * Exports `JobListingRow` — title + company + location + employment type +
 * salary + posted date, with optional leading logo, tag chips, and
 * right-side actions.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { JobListingRow } from '@molecule/app-job-listing-row-svelte'
 *
 *   declare function openJob(): void
 * </script>
 *
 * <JobListingRow
 *   title="Senior Frontend Engineer"
 *   company="Acme Corp"
 *   location="Remote · US"
 *   type="Full-time"
 *   salary="$130k–$160k"
 *   postedAt="2 days ago"
 *   onclick={openJob}
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
 * Node-valued props (`title`, `company`, `location`, `type`, `salary`,
 * `postedAt`, `leading`, `actions`, `tags`) arrive as snippets; strings
 * render as text.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
