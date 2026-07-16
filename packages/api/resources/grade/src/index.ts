/**
 * Grade resource for molecule.dev.
 *
 * Stores per-student per-course assignment grades and computes course
 * averages, GPAs, and transcripts. Letter-grade resolution is driven by
 * an injected {@link GradeScale} so different institutions can use
 * different scales (4.0, 4.3, plus/minus, etc.). All user-facing text
 * is i18n-ready via the companion `@molecule/api-locales-resource-grade`
 * bond.
 *
 * @module
 * @example
 * ```typescript
 * import {
 *   routes,
 *   requestHandlerMap,
 *   getCourseAverage,
 *   getGpa,
 *   getTranscript,
 *   defaultGradeScale,
 * } from '@molecule/api-resource-grade'
 * ```
 *
 * @remarks
 * Table: `src/__setup__/grades.sql` creates `grades`. An mlcl-scaffolded API
 * replays `__setup__/*.sql` automatically on migrate; anywhere else run it
 * once — nothing at runtime creates it.
 *
 * **A grade row's `userId` is the STUDENT being graded, NOT the actor allowed
 * to edit it** — letting the row's owner mutate it would let students change
 * their own grades. Mutations (`POST/PATCH/DELETE /grades…`) are therefore
 * role-gated and DENY BY DEFAULT: the caller needs an admin session claim
 * (`isAdmin`, `role: 'admin'`, or a `grade:manage`/`admin` permissions claim)
 * or an `@molecule/api-permissions` grant (`manage grade`). Out of the box NO
 * ONE can write grades — grant your instructor/registrar role first; a 403
 * here means "grant the permission", never "remove the gate". The gate is
 * enforced both as the `requireAdmin` route middleware and inside every
 * mutation handler (fail-closed), so it holds even when routes are wired
 * without middlewares.
 *
 * Reads are self-or-admin: `GET /users/:userId/gpa` and `…/transcript` reject
 * callers whose session userId ≠ `:userId` unless they are a grade admin —
 * handlers read the authenticated user from `res.locals.session` (mount
 * behind your global auth middleware).
 */

export * from './browser-guard.js'
export * from './aggregate.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './i18n.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './scale.js'
export * from './types.js'
