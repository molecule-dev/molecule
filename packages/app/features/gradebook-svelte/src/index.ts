/**
 * Svelte gradebook UI — unified table of grades + optional GPA hero card.
 *
 * Pairs with the `@molecule/api-resource-grade` resource. Rows can be courses
 * or assignments — the caller picks the granularity. The letter column renders
 * `Grade.letter` as plain text (string); pass pre-styled content via `title`
 * if you need richer cells.
 *
 * This is the Svelte counterpart of `@molecule/app-gradebook-react`: the same
 * exports, the same props (React names), and the same DOM for the same input,
 * so an app switches framework by changing only the package name in its
 * imports. Node-valued props are snippets.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import type { Grade } from '@molecule/app-gradebook-svelte'
 *   import { GpaCard, Gradebook } from '@molecule/app-gradebook-svelte'
 *
 *   const rows: Grade[] = [
 *     { id: 'g1', title: 'Algebra II', letter: 'A-', score: 92, weight: 0.25, contribution: 0.92 },
 *   ]
 * </script>
 *
 * <GpaCard gpa={3.72} scale="4.0" trend="up">
 *   {#snippet trendLabel()}<em>vs last semester</em>{/snippet}
 * </GpaCard>
 * <Gradebook gpaScale="4.0" grades={rows} />
 * ```
 *
 * @remarks
 * All visible text routes through `t()` via the companion
 * `@molecule/app-locales-gradebook` locale bond. Both components call
 * `useTranslation()` from `@molecule/app-svelte` (it falls back to the bonded
 * provider) and `getClassMap()` (requires a bonded ClassMap such as
 * `@molecule/app-ui-tailwind`) — wire both before rendering. No Tailwind
 * utilities appear in this package.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
export * from './utilities.js'
