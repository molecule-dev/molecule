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
 * import { GpaCard, type Grade, Gradebook } from '@molecule/app-gradebook-react'
 *
 * const courses = [
 *   { id: 'alg', title: 'Algebra II', letter: 'A-', score: 92, credits: 4, postedAt: 'Dec 12' },
 *   { id: 'bio', title: 'Biology', letter: 'B+', score: 88, credits: 3, postedAt: 'Dec 14' },
 *   { id: 'art', title: 'Studio Art', letter: 'A', score: 97, credits: 2, postedAt: 'Dec 15' },
 * ]
 * const points: Record<string, number> = { A: 4, 'A-': 3.7, 'B+': 3.3 }
 * const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0)
 *
 * // The components compute NOTHING: weight, contribution and the GPA are yours.
 * const grades: Grade[] = courses.map((c) => ({
 *   ...c,
 *   weight: c.credits / totalCredits,
 *   contribution: (points[c.letter] ?? 0) * (c.credits / totalCredits),
 * }))
 * const gpa = grades.reduce((sum, g) => sum + (g.contribution ?? 0), 0)
 *
 * export function GradesPage() {
 *   return (
 *     <>
 *       <GpaCard gpa={gpa} scale="4.0" trend="up" trendLabel="vs. last semester" />
 *       <Gradebook gpaScale="4.0" grades={grades} />
 *     </>
 *   )
 * }
 * ```
 *
 * @remarks
 * Display-only: neither component derives a GPA, letter, weight or
 * contribution — `GpaCard.gpa` and each row's `weight` (a 0–1 FRACTION,
 * shown as a %) / `contribution` must be computed by you (or the API).
 * `score` is out of `maxPoints` (default 100); with `gpaScale="percentage"`
 * the score column shows `score / maxPoints` as a rounded %. `postedAt` is
 * shown as given. An empty `grades` array renders a "No grades yet."
 * region instead of the table.
 *
 * All visible text routes through `t()` via the companion
 * `@molecule/app-locales-gradebook` locale bond. Both components call
 * `useTranslation()` (THROWS outside `@molecule/app-react`'s `I18nProvider`)
 * and `getClassMap()` (requires a bonded ClassMap such as
 * `@molecule/app-ui-tailwind`, via `setClassMap(classMap)`) — wire both
 * before rendering. `GpaCard` also renders `Card` from the
 * `@molecule/app-ui-react` peer dependency.
 *
 * @module
 */

export * from './GpaCard.js'
export * from './Gradebook.js'
export * from './types.js'
export * from './utilities.js'
