/**
 * Vue badge / achievement unlock card.
 *
 * Exports `<AchievementCard>` — the Vue counterpart of
 * `@molecule/app-achievement-card-react` with the same props (React names),
 * the same ClassMap tokens and the same DOM for the same input. Locked
 * achievements render greyed-out; in-progress ones show a progress bar.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 *
 * import { AchievementCard } from '@molecule/app-achievement-card-vue'
 *
 * const App = defineComponent({
 *   setup() {
 *     return () =>
 *       h(
 *         AchievementCard,
 *         {
 *           name: 'First Login',
 *           description: 'Signed in for the first time.',
 *           earned: true,
 *           earnedAt: 'Jan 3, 2025',
 *           tier: 'Common',
 *         },
 *         { icon: () => [h('span', null, '🏆')] },
 *       )
 *   },
 * })
 *
 * createApp(App).mount('#app')
 * ```
 *
 * @remarks
 * The "Earned"/"Locked" state labels flow through `t()` with English
 * `defaultValue` fallbacks under the `achievementCard.*` keys, so the
 * `@molecule/app-locales-achievement-card` companion bond (or the host app's
 * own locale) can translate them. Each is also overridable per-instance via
 * the `earnedLabel` / `lockedLabel` props (prop > `t()` > default). The labels
 * are read through `useTranslation()`, so they follow a locale switch.
 * Node-valued props (`name`, `description`, `icon`, `earnedAt`, `tier`) arrive
 * as a prop AND a same-named slot; components accept either.
 *
 * @module
 */

export * from './AchievementCard.js'
export * from './types.js'
