/**
 * Angular hero metric card primitives.
 *
 * Exports:
 * - `HeroMetricCard` — top-of-dashboard hero metric card (`div[mol-hero-metric-card]`).
 * - `HeroMetricTrendChip` — directional ▲/▼ + delta chip (`span[mol-hero-metric-trend-chip]`).
 * - Type aliases: `HeroMetricCardProps`, `HeroMetricTrend`,
 *   `HeroMetricTrendDirection`, `HeroMetricAccent`, `HeroMetricSemanticAccent`,
 *   `HeroMetricTrendChipProps`.
 *
 * This is the Angular counterpart of `@molecule/app-hero-metric-card-react`: the
 * same exports, the same props (React names), and the same DOM for the same
 * input, so an app switches framework by changing only the package name in its
 * imports. Node props are projected content (`[slot=<name>]`).
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { HeroMetricCard } from '@molecule/app-hero-metric-card-angular'
 *
 * @Component({
 *   selector: 'app-dashboard',
 *   standalone: true,
 *   imports: [HeroMetricCard],
 *   template: `
 *     <div mol-hero-metric-card
 *          title="Total Revenue"
 *          value="$84,320"
 *          unit="USD"
 *          accent="success"
 *          [trend]="{ direction: 'up', delta: '+12.4%' }"
 *          subtitle="vs last month"
 *          (click)="goTo('/revenue')"></div>
 *   `,
 * })
 * export class Dashboard {
 *   readonly goTo = (path: string): void => {
 *     console.log('navigate to', path)
 *   }
 * }
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

export * from './hero-metric-card.component.js'
export * from './hero-metric-trend-chip.component.js'
export * from './types.js'
