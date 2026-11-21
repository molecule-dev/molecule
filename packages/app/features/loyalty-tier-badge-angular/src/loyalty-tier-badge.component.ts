/**
 * LoyaltyTierBadge component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import type { LoyaltyTier, LoyaltyTierBadgeProps } from './types.js'
import { computeProgress, nextTierOf } from './utils.js'

/**
 * Accent color per tier — the metallic color IS the tier's identity (data), so
 * it never follows the theme; the badge's neutral chrome comes from the ClassMap.
 */
const TIER_COLOR: Record<LoyaltyTier, string> = {
  bronze: '#b87333',
  silver: '#c0c0c0',
  gold: '#d4af37',
  platinum: '#e5e4e2',
}

/** The glyph's pixel size per `size` prop. */
const SIZE_PX: Record<NonNullable<LoyaltyTierBadgeProps['size']>, number> = {
  sm: 36,
  md: 56,
  lg: 80,
}

/**
 * LoyaltyTierBadge component.
 *
 * Bronze/Silver/Gold/Platinum tier badge: a colored glyph holding the label's
 * first letter, the tier label, and — when `points` and `nextTierThreshold`
 * are both given and a next tier exists — a progress bar plus an "X to next
 * tier" readout; platinum shows "Top tier reached" instead. The host IS the
 * outer `<div>` (`div[mol-loyalty-tier-badge]`), matching React's root
 * exactly: same classes, same attributes, same inline styles.
 *
 * This is the Angular counterpart of `@molecule/app-loyalty-tier-badge-react`.
 */
@Component({
  selector: 'div[mol-loyalty-tier-badge]',
  standalone: true,
  inputs: [
    'tier',
    'points',
    'nextTierThreshold',
    'nextTierLabel',
    'tierLabel',
    'size',
    'dataMolId',
    'className',
  ],
  host: {
    role: 'group',
    '[class]': 'classes()',
    '[attr.data-mol-id]': 'dataMolId ?? "loyalty-tier-badge"',
    '[attr.data-tier]': 'tier',
    '[attr.aria-label]': 'groupLabel()',
  },
  // prettier-ignore
  template: `<span aria-hidden="true" [class]="glyphClasses()" [style]="glyphStyle()" data-mol-id="loyalty-tier-glyph">{{ tierInitial() }}</span><div [class]="bodyClasses()" style="flex: 1 1 0%"><span [class]="tierNameClasses()">{{ tierName() }}</span>@if (showProgress()) {<div role="progressbar" aria-valuemin="0" aria-valuemax="100" [attr.aria-valuenow]="percent()" [attr.aria-label]="progressLabel()" data-mol-id="loyalty-tier-progress" [class]="trackClasses()" [style]="progressOuterStyle()"><div [style]="progressInnerStyle()"></div></div><span [class]="subTextClasses()" data-mol-id="loyalty-tier-progress-label">{{ remainingLabel() }}</span>} @else if (isTopTier()) {<span [class]="subTextClasses()" data-mol-id="loyalty-tier-top">{{ topTierLabel() }}</span>}</div>`,
})
export class LoyaltyTierBadge {
  /** Current tier. */
  tier!: LoyaltyTier
  /** Member's current points / nights / qualifying activity. */
  points?: number
  /** Threshold at which the next tier is earned (same unit as `points`). */
  nextTierThreshold?: number
  /** Override the auto-derived next-tier label (e.g. "Diamond"). */
  nextTierLabel?: string
  /** Override the displayed tier label (defaults to the translated name). */
  tierLabel?: string
  /** Display size (defaults to `'md'` at read time). */
  size?: 'sm' | 'md' | 'lg'
  /** `data-mol-id` for AI-agent selectors (defaults to `'loyalty-tier-badge'`). */
  dataMolId?: string
  /** Extra classes appended via the ClassMap `cn()` helper. */
  className?: string

  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The glyph's pixel size (React's `size` default parameter).
   * @returns The pixel size.
   */
  px(): number {
    return SIZE_PX[this.size ?? 'md']
  }

  /**
   * The glyph's accent color for the current tier.
   * @returns The fixed metallic hex.
   */
  accent(): string {
    return TIER_COLOR[this.tier]
  }

  /**
   * The next tier, or null at the top of the ladder.
   * @returns The next tier name.
   */
  next(): LoyaltyTier | null {
    return nextTierOf(this.tier)
  }

  /**
   * Progress toward the next tier, clamped to 0–1.
   * @returns The progress ratio.
   */
  progress(): number {
    return computeProgress(this.points, this.nextTierThreshold)
  }

  /**
   * Whether the progress bar and its readout render (React's `showProgress`).
   * @returns True when both numbers are set, the threshold is positive, and a
   *   next tier exists.
   */
  showProgress(): boolean {
    return (
      typeof this.points === 'number' &&
      typeof this.nextTierThreshold === 'number' &&
      this.nextTierThreshold > 0 &&
      this.next() !== null
    )
  }

  /**
   * Whether the member is at the highest tier (React's `next === null`).
   * @returns True at platinum.
   */
  isTopTier(): boolean {
    return this.next() === null
  }

  /**
   * The progress percentage, rounded (React's `Math.round(progress * 100)`).
   * @returns The whole percentage.
   */
  percent(): number {
    return Math.round(this.progress() * 100)
  }

  /**
   * The translated name of a tier rung. Every rung is a literal key (the
   * locale bond owns `loyaltyTierBadge.tier.<rung>`), so the i18n gate can
   * check each one exists in the bond.
   * @param rung - The tier to name.
   * @returns The tier's translated name.
   */
  translatedTierName(rung: LoyaltyTier): string {
    switch (rung) {
      case 'bronze':
        return this.i18n.t('loyaltyTierBadge.tier.bronze', {}, { defaultValue: 'Bronze' })
      case 'silver':
        return this.i18n.t('loyaltyTierBadge.tier.silver', {}, { defaultValue: 'Silver' })
      case 'gold':
        return this.i18n.t('loyaltyTierBadge.tier.gold', {}, { defaultValue: 'Gold' })
      case 'platinum':
        return this.i18n.t('loyaltyTierBadge.tier.platinum', {}, { defaultValue: 'Platinum' })
    }
  }

  /**
   * The displayed tier label: `tierLabel` when given, else the translated tier
   * name (prop > `t()` > `defaultValue`).
   * @returns The tier label.
   */
  tierName(): string {
    return this.tierLabel ?? this.translatedTierName(this.tier)
  }

  /**
   * The glyph's single-letter initial (React's `tierName.charAt(0)`).
   * @returns The first character of the tier label.
   */
  tierInitial(): string {
    return this.tierName().charAt(0)
  }

  /**
   * The next tier's label: `nextTierLabel` when given, else the translated
   * name, else the empty string at the top tier.
   * @returns The next-tier label.
   */
  nextName(): string {
    if (this.nextTierLabel !== undefined && this.nextTierLabel !== null) return this.nextTierLabel
    const upcoming = this.next()
    if (!upcoming) return ''
    return this.translatedTierName(upcoming)
  }

  /**
   * Points still needed for the next tier, never negative.
   * @returns The remaining amount (0 when the progress bar is hidden).
   */
  remaining(): number {
    if (!this.showProgress()) return 0
    return Math.max(0, (this.nextTierThreshold ?? 0) - (this.points ?? 0))
  }

  /**
   * The wrapper's accessible name (`{{tier}} tier`).
   * @returns The `aria-label` text.
   */
  groupLabel(): string {
    return this.i18n.t(
      'loyaltyTierBadge.group',
      { tier: this.tierName() },
      { defaultValue: '{{tier}} tier' },
    )
  }

  /**
   * The progress bar's accessible name (`Progress to {{next}}`).
   * @returns The `aria-label` text.
   */
  progressLabel(): string {
    return this.i18n.t(
      'loyaltyTierBadge.progress',
      { next: this.nextName() },
      { defaultValue: 'Progress to {{next}}' },
    )
  }

  /**
   * The remaining-points readout (`{{remaining}} to {{next}}`).
   * @returns The readout text.
   */
  remainingLabel(): string {
    return this.i18n.t(
      'loyaltyTierBadge.remaining',
      { remaining: this.remaining(), next: this.nextName() },
      { defaultValue: '{{remaining}} to {{next}}' },
    )
  }

  /**
   * The top-tier message (`Top tier reached`).
   * @returns The message text.
   */
  topTierLabel(): string {
    return this.i18n.t('loyaltyTierBadge.topTier', {}, { defaultValue: 'Top tier reached' })
  }

  /**
   * The inline style of the glyph (React's `glyphStyle`).
   * @returns The style attribute text.
   */
  glyphStyle(): string | null {
    const size = this.px()
    const accent = this.accent()
    return styleText({
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      // The tier's metallic accent is data (the tier's identity), not a theme tone.
      background: `radial-gradient(circle at 30% 30%, ${accent} 0%, ${accent}99 60%, ${accent}66 100%)`,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      fontWeight: 700,
      fontSize: `${Math.round(size * 0.45)}px`,
    })
  }

  /**
   * The glyph's class (React's `cm.borderAll` — the theme's border color),
   * routed through `cn()` like every token read.
   * @returns The class string.
   */
  glyphClasses(): string {
    return this.cm().cn(this.cm().borderAll)
  }

  /**
   * The inline style of the progress track (React's `progressOuter`).
   * @returns The style attribute text.
   */
  progressOuterStyle(): string | null {
    return styleText({
      position: 'relative',
      height: '6px',
      borderRadius: '3px',
      overflow: 'hidden',
      width: '100%',
    })
  }

  /**
   * The progress track's class (React's `cm.surfaceSecondary` — the theme's
   * recessed surface), routed through `cn()` like every token read.
   * @returns The class string.
   */
  trackClasses(): string {
    return this.cm().cn(this.cm().surfaceSecondary)
  }

  /**
   * The inline style of the progress fill (React's `progressInner`).
   * @returns The style attribute text.
   */
  progressInnerStyle(): string | null {
    return styleText({
      width: `${this.percent()}%`,
      height: '100%',
      // The fill carries the tier's accent (data).
      background: this.accent(),
      transition: 'width 200ms ease',
    })
  }

  /**
   * The wrapper's class list (React's `cm.flex(...)` + `className`).
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    return cm.cn(cm.flex({ align: 'center', gap: 'sm' }), this.className)
  }

  /**
   * The body column's class list (React's `cm.flex({ direction: 'col', gap: 'xs' })`).
   * @returns The class string.
   */
  bodyClasses(): string {
    return this.cm().flex({ direction: 'col', gap: 'xs' })
  }

  /**
   * The tier label's class list (React's `cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))`).
   * @returns The class string.
   */
  tierNameClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))
  }

  /**
   * The secondary lines' class list (React's
   * `cm.cn(cm.textSize('xs'), cm.textMuted)`).
   * @returns The class string.
   */
  subTextClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('xs'), cm.textMuted)
  }
}
