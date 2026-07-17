/**
 * Health and fitness data interface for molecule.dev.
 *
 * Framework-agnostic CONTRACT for on-device health stores (Apple HealthKit,
 * Android Health Connect): per-type authorization, sample/statistics
 * queries, workouts, sleep, and writes — through a swappable
 * `HealthProvider`. Pure helpers (`getUnitForType`, `getTodayRange`,
 * `getLastDaysRange`, `calculateSleepEfficiency`, `DataTypeGroups`) work
 * without a provider.
 *
 * @example
 * ```typescript
 * import {
 *   getCapabilities,
 *   getStepsToday,
 *   hasProvider,
 *   requestAuthorization,
 * } from '@molecule/app-health'
 *
 * async function todaysSteps(): Promise<number | null> {
 *   if (!hasProvider()) return null // no provider wired — hide the widget
 *   const caps = await getCapabilities()
 *   if (!caps.supported) return null
 *   const granted = await requestAuthorization(['steps'])
 *   if (!granted) return null
 *   return getStepsToday()
 * }
 * ```
 *
 * @remarks
 * - **Interface only — NO real health provider ships with molecule yet.**
 *   There is no `@molecule/app-health-*` provider package: every data
 *   accessor THROWS an actionable error until you `setProvider()` a
 *   `HealthProvider` you implement yourself against your native runtime's
 *   Apple HealthKit / Android Health Connect / Google Fit bindings (that
 *   native bridge is your integration work — it is multi-platform native
 *   code, not a config flag). It deliberately does NOT fall back to a silent
 *   no-op: a health read has no honest default, so fake zeros would be worse
 *   than a throw. **ALWAYS feature-detect first** — check `hasProvider()`
 *   (and `getCapabilities().supported`) before any read or write, and hide
 *   the feature when it is false. Browsers have no health-store API at all:
 *   on web, hide the feature or use server-side wearable sync
 *   (`@molecule/api-wearable`) instead. Do NOT ship health UI that assumes
 *   this works out of the box.
 * - **Authorization is per data type and per direction** —
 *   `requestAuthorization(readTypes, writeTypes)`. iOS never reveals
 *   whether READ access was denied (queries just return empty) — treat
 *   "empty forever" as possibly-denied and link to the OS health app
 *   (`openHealthApp()`), don't retry-prompt.
 * - Ask for the narrowest set of types the feature needs, at the point of
 *   use — health data is the most sensitive class of personal data; both
 *   app stores review over-broad requests.
 * - Amounts/units are provider-normalized; use `getUnitForType(type)` for
 *   display rather than hardcoding units.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
export * from './utilities.js'
