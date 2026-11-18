/**
 * Vue hero metric card primitives.
 *
 * Exports:
 * - `<HeroMetricCard>` — top-of-dashboard hero metric card.
 * - `<HeroMetricTrendChip>` — directional ▲/▼ + delta chip used inside the card.
 * - Type aliases: `HeroMetricCardProps`, `HeroMetricTrend`,
 *   `HeroMetricTrendDirection`, `HeroMetricAccent`, `HeroMetricSemanticAccent`,
 *   `HeroMetricTrendChipProps`.
 *
 * This is the Vue counterpart of `@molecule/app-hero-metric-card-react`: the
 * same exports, the same props (React names), and the same DOM for the same
 * input, so an app switches framework by changing only the package name in its
 * imports. Node-valued props (`title`, `value`, `unit`, `subtitle`,
 * `progressRing`, `icon`) arrive as a prop or as a same-named slot.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 *
 * import { HeroMetricCard } from '@molecule/app-hero-metric-card-vue'
 *
 * const App = defineComponent({
 *   setup() {
 *     return () =>
 *       h(HeroMetricCard, {
 *         title: 'Total Revenue',
 *         value: '$84,320',
 *         unit: 'USD',
 *         trend: { direction: 'up', delta: '+12.4%' },
 *         subtitle: 'vs last month',
 *         accent: 'success',
 *         onClick: () => goTo('/revenue'),
 *       })
 *   },
 * })
 *
 * createApp(App).mount('#app')
 * ```
 *
 * @remarks
 * - Every semantic `accent` (`primary`/`success`/`warning`/`danger`/`info`/
 *   `neutral`) resolves to a REAL, theme-aware ClassMap color via
 *   `cm.progressColor()` — visibly colored in both light and dark themes.
 *   `danger` maps to the theme's `error` token and `neutral` to `secondary`
 *   (the theme defines no `danger`/`neutral` token). A raw CSS color string is
 *   also accepted for one-off brand accents.
 * - Styling routes through `getClassMap()` (muted text = `cm.textMuted`,
 *   caps/tracking = `cm.uppercase`/`cm.trackingWide`). The lone raw utility
 *   (`leading-none` on the big value) comes from `cm.heroMetricCardValue`.
 * - `getClassMap()` requires a bonded ClassMap. Text uses
 *   `@molecule/app-i18n`'s `t()` through `useTranslation()`, so it follows a
 *   locale switch, with English fallbacks — the companion
 *   `@molecule/app-locales-hero-metric-card` bond supplies translations.
 *
 * @module
 */

export * from './HeroMetricCard.js'
export * from './HeroMetricTrendChip.js'
export * from './types.js'
