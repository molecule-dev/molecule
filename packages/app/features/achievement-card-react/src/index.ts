/**
 * Badge / achievement unlock card.
 *
 * Exports `<AchievementCard>`.
 *
 * @example
 * ```tsx
 * import { AchievementCard } from '@molecule/app-achievement-card-react'
 *
 * <AchievementCard
 *   icon={<span>🏆</span>}
 *   name="First Login"
 *   description="Signed in for the first time."
 *   earned
 *   earnedAt="Jan 3, 2025"
 *   tier="Common"
 * />
 * ```
 *
 * @remarks
 * The "Earned"/"Locked" state labels flow through `t()` with English
 * `defaultValue` fallbacks under the `achievementCard.*` keys, so a wired
 * locale bond (or the host app's own locale) can translate them. Each is also
 * overridable per-instance via the `earnedLabel` / `lockedLabel` props
 * (prop > `t()` > default).
 *
 * @module
 */

export * from './AchievementCard.js'
