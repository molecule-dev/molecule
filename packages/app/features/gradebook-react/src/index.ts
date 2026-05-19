/**
 * Gradebook UI — unified table of grades + optional GPA hero card.
 *
 * Pairs with the new `@molecule/api-resource-grade` resource. Composes with
 * `@molecule/app-status-badge-react` for letter-grade chips when the caller
 * wants a styled letter column.
 *
 * @example
 * ```tsx
 * import { Gradebook, GpaCard } from '@molecule/app-gradebook-react'
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
 * `@molecule/app-locales-gradebook` locale bond. All styling routes
 * through `getClassMap()` — no Tailwind utilities appear in this package.
 *
 * @module
 */

export * from './types.js'
export * from './utilities.js'
export * from './Gradebook.js'
export * from './GpaCard.js'
