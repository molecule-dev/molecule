/**
 * Vue job-board listing row.
 *
 * Exports `JobListingRow` — title + company + location + employment type +
 * salary + posted date, with optional leading logo, tag chips, and
 * right-side actions. It is the Vue counterpart of
 * `@molecule/app-job-listing-row-react`: the same props (React names) and the
 * same DOM for the same input.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { JobListingRow } from '@molecule/app-job-listing-row-vue'
 *
 * const App = defineComponent({
 *   setup() {
 *     const openJob = (): void => {
 *       // navigate to the job…
 *     }
 *     return () =>
 *       h(JobListingRow, {
 *         title: 'Senior Frontend Engineer',
 *         company: 'Acme Corp',
 *         location: 'Remote · US',
 *         type: 'Full-time',
 *         salary: '$130k–$160k',
 *         postedAt: '2 days ago',
 *         onClick: openJob,
 *       })
 *   },
 * })
 *
 * createApp(App).mount('#app')
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
 * `postedAt`, `leading`, `actions`, `tags`) arrive as a prop AND a same-named
 * slot; components accept either.
 *
 * @module
 */

export * from './JobListingRow.js'
export * from './types.js'
