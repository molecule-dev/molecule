/**
 * Vue reputation/karma surfaces — `<ReputationBadge>` and `<BadgeShelf>` —
 * for forum, discussion-board, and social flagships.
 *
 * `<ReputationBadge score={n} />` renders a compact-formatted score ("1.5k")
 * plus a tier chip; the tier derives from `score` via `levelForScore` and
 * `DEFAULT_THRESHOLDS` (contributor 100, trusted 500, veteran 2000,
 * legend 10000) unless you pass `level` or `thresholds`. `variant` is
 * `'compact'` (default) or `'full'`
 * (stacked with a "Reputation" caption). `<BadgeShelf badges limit onClick />`
 * renders earned-badge icons with a trailing `+N` overflow chip
 * (`onClick(null)` signals "expand all").
 *
 * This is the Vue counterpart of `@molecule/app-reputation-badge-react`: same
 * exports, same props (React names), same DOM for the same input.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { BadgeShelf, ReputationBadge } from '@molecule/app-reputation-badge-vue'
 * import type { Badge } from '@molecule/app-reputation-badge-vue'
 *
 * const ProfileHeader = defineComponent({
 *   props: { score: { type: Number, required: true }, badges: { type: Array, required: true } },
 *   setup(props) {
 *     return () =>
 *       h('div', [
 *         h(ReputationBadge, { score: props.score, variant: 'full' }),
 *         h(BadgeShelf, {
 *           badges: props.badges as Badge[],
 *           limit: 5,
 *           onClick: (badge: Badge | null) => console.log(badge),
 *         }),
 *       ])
 *   },
 * })
 *
 * createApp(ProfileHeader).mount('#app')
 * ```
 *
 * @remarks
 * - Both components throw unless mounted under `moleculePlugin` with i18n
 *   (`useTranslation()` needs a provider) and a ClassMap bonded via
 *   `setClassMap()`.
 * - This package exports a `Badge` TYPE (earned-badge data shape) — distinct
 *   from the `Badge` COMPONENT in `@molecule/app-ui-vue`; alias one when
 *   importing both in a file.
 * - Server-side score/badge issuance pairs with `@molecule/api-reputation`.
 * - Translations live in the companion `@molecule/app-locales-reputation-badge`
 *   bond (registered).
 *
 * @module
 */

export * from './BadgeShelf.js'
export * from './levels.js'
export * from './ReputationBadge.js'
export * from './types.js'
