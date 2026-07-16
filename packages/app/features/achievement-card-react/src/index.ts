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
 * The "Earned"/"Locked" state labels are currently English-only (not
 * i18n-routed) — no override prop exists yet.
 *
 * @module
 */

export * from './AchievementCard.js'
