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
 * `onClick` makes the whole row clickable but the root is a plain `<div>`
 * with no `role`, `tabIndex`, or keyboard handler — keyboard users can only
 * reach whatever you pass in `actions`. Put a real link or button in
 * `actions` when the row is the primary navigation affordance.
 *
 * Node-valued props (`title`, `company`, `location`, `type`, `salary`,
 * `postedAt`, `leading`, `actions`, `tags`) arrive as a prop AND a same-named
 * slot; components accept either.
 *
 * @module
 */

export * from './JobListingRow.js'
export * from './types.js'
