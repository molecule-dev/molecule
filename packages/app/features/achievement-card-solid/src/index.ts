/**
 * Solid badge / achievement unlock card.
 *
 * Exports `AchievementCard` — the Solid counterpart of
 * `@molecule/app-achievement-card-react` with the same props, the same
 * ClassMap tokens and the same DOM for the same input. Locked achievements
 * render greyed-out; in-progress ones show a progress bar.
 *
 * @example
 * ```tsx
 * import { AchievementCard } from '@molecule/app-achievement-card-solid'
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
 * `defaultValue` fallbacks under the `achievementCard.*` keys, so the
 * `@molecule/app-locales-achievement-card` companion bond (or the host app's
 * own locale) can translate them. Each is also overridable per-instance via
 * the `earnedLabel` / `lockedLabel` props (prop > `t()` > default). The labels
 * are read through `useTranslation()`, so they follow a locale switch.
 *
 * @module
 */

export * from './AchievementCard.jsx'
export * from './types.js'
