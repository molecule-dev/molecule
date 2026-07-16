/**
 * Gradebook UI — unified table of grades + optional GPA hero card.
 *
 * Pairs with the `@molecule/api-resource-grade` resource. Rows can be courses
 * or assignments — the caller picks the granularity. The letter column renders
 * `Grade.letter` as plain text (string); pass pre-styled content via `title`
 * if you need richer cells.
 *
 * @example
 * ```tsx
 * import type { Grade } from '@molecule/app-gradebook-react'
 * import { Gradebook, GpaCard } from '@molecule/app-gradebook-react'
 *
 * const rows: Grade[] = [
 *   { id: 'g1', title: 'Algebra II', letter: 'A-', score: 92, weight: 0.25, contribution: 0.92 },
 * ]
 *
 * function GradesPage() {
 *   return (
 *     <>
 *       <GpaCard gpa={3.72} scale="4.0" trend="up" />
 *       <Gradebook gpaScale="4.0" grades={rows} />
 *     </>
 *   )
 * }
 * ```
 *
 * @remarks
 * All visible text routes through `t()` via the companion
 * `@molecule/app-locales-gradebook` locale bond. Both components call
 * `useTranslation()` (THROWS outside `@molecule/app-react`'s `I18nProvider`)
 * and `getClassMap()` (requires a bonded ClassMap such as
 * `@molecule/app-ui-tailwind`) — wire both before rendering. No Tailwind
 * utilities appear in this package.
 *
 * @module
 */

export * from './GpaCard.js'
export * from './Gradebook.js'
export * from './types.js'
export * from './utilities.js'
