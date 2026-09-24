/**
 * Badge / achievement unlock card.
 *
 * Exports `<AchievementCard>`.
 *
 * @example
 * ```tsx
 * import { AchievementCard } from '@molecule/app-achievement-card-react'
 *
 * export function AchievementsPage() {
 *   const achievements = [
 *     { id: 'first-login', name: 'First Login', description: 'Signed in for the first time.', earned: true, earnedAt: 'Jan 3, 2025' },
 *     { id: 'streak-7', name: '7-Day Streak', description: 'Signed in 7 days in a row.', earned: false, progress: { value: 3, max: 7 } },
 *   ]
 *   return (
 *     <section>
 *       {achievements.map((a) => (
 *         <AchievementCard
 *           key={a.id}
 *           icon={<span aria-hidden="true">🏆</span>}
 *           name={a.name}
 *           description={a.description}
 *           earned={a.earned}
 *           earnedAt={a.earnedAt}
 *           progress={a.progress}
 *           tier="Common"
 *         />
 *       ))}
 *     </section>
 *   )
 * }
 * ```
 *
 * @remarks
 * - **Needs a ClassMap bond.** It styles itself via `getClassMap()`, which throws unless the app
 *   called `setClassMap(classMap)` (from `@molecule/app-ui`, e.g. with `@molecule/app-ui-tailwind`)
 *   at startup. It also renders `Card` from `@molecule/app-ui-react` (a peer dependency).
 * - `name` and `icon` are REQUIRED. `earnedAt` only shows when `earned` is true; `progress`
 *   (`{ value, max }`, a bar at `value / max`) only shows when NOT earned — with neither, a
 *   "Locked" label renders. Locked cards are greyed out via inline opacity/grayscale.
 * - It is display-only: no click handler, no unlock logic, no persistence.
 * - The "Earned"/"Locked" state labels flow through `t()` with English
 *   `defaultValue` fallbacks under the `achievementCard.*` keys, so a wired
 *   locale bond (or the host app's own locale) can translate them. Each is also
 *   overridable per-instance via the `earnedLabel` / `lockedLabel` props
 *   (prop > `t()` > default).
 *
 * @module
 */

export * from './AchievementCard.js'
