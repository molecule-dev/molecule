/**
 * Svelte badge / achievement unlock card — the Svelte counterpart of
 * `@molecule/app-achievement-card-react`, with the same props and the same
 * DOM for the same input.
 *
 * Exports `AchievementCard` — icon + name + description + earned state.
 * Locked achievements render greyed-out; in-progress ones show a progress bar.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { AchievementCard } from '@molecule/app-achievement-card-svelte'
 * </script>
 *
 * <AchievementCard
 *   name="First Login"
 *   description="Signed in for the first time."
 *   earned
 *   earnedAt="Jan 3, 2025"
 *   tier="Common"
 * >
 *   {#snippet icon()}<span>🏆</span>{/snippet}
 * </AchievementCard>
 * ```
 *
 * @remarks
 * The "Earned"/"Locked" state labels flow through `t()` with English
 * `defaultValue` fallbacks under the `achievementCard.*` keys, so the
 * `@molecule/app-locales-achievement-card` companion bond (or the host app's
 * own locale) can translate them. Each is also overridable per-instance via
 * the `earnedLabel` / `lockedLabel` props (prop > `t()` > default). The labels
 * are read through `useTranslation()`, so they follow a locale switch.
 * Node-valued props (`name`, `description`, `icon`, `earnedAt`, `tier`) are
 * snippet props.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
