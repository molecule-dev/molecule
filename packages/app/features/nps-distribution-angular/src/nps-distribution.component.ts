/**
 * NpsDistribution component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import { computeNps } from './computeNps.js'
import type { NpsBucket, NpsResult, NpsTier } from './types.js'

/** Map a tier to a semantic color CSS custom-property exposed by every ClassMap bond. */
const TIER_COLOR_VAR: Record<NpsTier, string> = {
  detractor: 'var(--mol-color-error)',
  passive: 'var(--mol-color-warning)',
  promoter: 'var(--mol-color-success)',
}

const BAR_HEIGHT_PX = 14
const BAR_RADIUS_PX = 4

/**
 * NpsDistribution component.
 *
 * Net Promoter Score distribution chart — survey-feedback-tool flagship. Renders
 * an 11-row horizontal bar chart (one row per score 0..10) with detractor /
 * passive / promoter color tiers. Bar widths are scaled relative to the tallest
 * bucket so the busiest score always reaches 100% of the track. Below the bars
 * an optional NPS score line shows the computed score (range -100..100) and
 * total response count.
 *
 * The host IS the outer `<div>` (`div[mol-nps-distribution]`), matching React's
 * root exactly. This is the Angular counterpart of
 * `@molecule/app-nps-distribution-react`: the same props (React names), the
 * same ClassMap tokens and the same DOM for the same input.
 */
@Component({
  selector: 'div[mol-nps-distribution]',
  standalone: true,
  inputs: ['scores', 'showScore', 'detractorMax', 'passiveMax', 'className', 'dataMolId'],
  host: {
    role: 'figure',
    '[class]': 'classes()',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.data-mol-id]': 'dataMolId ?? null',
  },
  // prettier-ignore
  template: `<ul [class]="ulClasses()" [style]="ulStyleText()">@for (bucket of buckets(); track bucket.score) {<li [class]="rowClasses()" [attr.aria-label]="rowAria(bucket)" [attr.data-nps-score]="bucket.score" [attr.data-nps-tier]="bucket.tier"><span [class]="scoreClasses()" [style]="scoreStyleText()" aria-hidden="true">{{ bucket.score }}</span><span [style]="trackStyleText()" aria-hidden="true"><span [style]="fillStyleText(bucket)"></span></span><span [class]="countClasses()" [style]="countStyleText()" aria-hidden="true">{{ bucket.count }}</span></li>}</ul>@if (showScoreEffective) {<div [class]="scoreLineClasses()" role="status" aria-live="polite"><span [class]="scoreLabelClasses()">{{ scoreLabel() }}</span><span [class]="scoreValueClasses()" data-nps-score-value="true">{{ result().score }}</span><span [class]="responsesClasses()" [style]="responsesStyleText()">{{ responsesLabel() }}</span></div>}`,
})
export class NpsDistribution {
  /** Raw 0..10 scores. Out-of-range or non-integer values are ignored. */
  scores!: number[]
  /** Whether to render the computed NPS score line below the bars. Defaults to `true`. */
  showScore?: boolean
  /** Highest score still classified as a detractor. Defaults to `6`. */
  detractorMax?: number
  /** Highest score still classified as a passive. Defaults to `8`. */
  passiveMax?: number
  /** Extra classes on the outer wrapper. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string

  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()

  /**
   * Whether the score line renders (React's `showScore = true` default).
   * @returns True when the score line shows.
   */
  get showScoreEffective(): boolean {
    return this.showScore ?? true
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The computed NPS result for the current props.
   * @returns The {@link NpsResult}.
   */
  result(): NpsResult {
    return computeNps(this.scores ?? [], this.detractorMax ?? 6, this.passiveMax ?? 8)
  }

  /**
   * The per-score rows in display order (0 → 10).
   * @returns The {@link NpsBucket} rows.
   */
  buckets(): NpsBucket[] {
    return this.result().buckets
  }

  /**
   * The tallest bucket's count, used to scale every bar.
   * @returns The maximum count, or 0 for an empty dataset.
   */
  maxBucket(): number {
    return this.buckets().reduce((m, b) => (b.count > m ? b.count : m), 0)
  }

  /**
   * The localized wrapper aria-label.
   * @returns The translated label.
   */
  ariaLabel(): string {
    return this.i18n.t(
      'nps-distribution.aria-label',
      { total: String(this.result().total) },
      { defaultValue: 'NPS distribution chart, {{total}} responses' },
    )
  }

  /**
   * The localized aria-label of one row.
   * @param bucket - The row.
   * @returns The translated label.
   */
  rowAria(bucket: NpsBucket): string {
    return this.i18n.t(
      'nps-distribution.row.aria',
      {
        score: String(bucket.score),
        count: String(bucket.count),
        tier: this.tierLabel(bucket.tier),
      },
      { defaultValue: 'Score {{score}} ({{tier}}): {{count}}' },
    )
  }

  /**
   * The localized tier label.
   * @param tier - The tier.
   * @returns The translated tier label.
   */
  tierLabel(tier: NpsTier): string {
    if (tier === 'detractor')
      return this.i18n.t('nps-distribution.tier.detractor', {}, { defaultValue: 'Detractor' })
    if (tier === 'passive')
      return this.i18n.t('nps-distribution.tier.passive', {}, { defaultValue: 'Passive' })
    return this.i18n.t('nps-distribution.tier.promoter', {}, { defaultValue: 'Promoter' })
  }

  /**
   * The localized score-line label.
   * @returns The "NPS" label.
   */
  scoreLabel(): string {
    return this.i18n.t('nps-distribution.score.label', {}, { defaultValue: 'NPS' })
  }

  /**
   * The localized response-count label.
   * @returns The translated `{{total}} responses` label.
   */
  responsesLabel(): string {
    return this.i18n.t(
      'nps-distribution.score.responses',
      { total: String(this.result().total) },
      { defaultValue: '{{total}} responses' },
    )
  }

  /**
   * The wrapper's class list (React's `cm.cn(cm.stack(2), className)`).
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    return cm.cn(cm.stack(2), this.className)
  }

  /**
   * The list's class list (React's `cm.stack(1)`).
   * @returns The class string.
   */
  ulClasses(): string {
    return this.cm().stack(1)
  }

  /**
   * The list's inline style (React's `{ listStyle: 'none', padding: 0, margin: 0 }`).
   * @returns The style attribute text.
   */
  ulStyleText(): string | null {
    return styleText({ listStyle: 'none', padding: '0px', margin: '0px' })
  }

  /**
   * A row's class list (React's `cm.flex({ align: 'center', gap: 'sm' })`).
   * @returns The class string.
   */
  rowClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'sm' })
  }

  /**
   * The score cell's class list (React's `cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))`).
   * @returns The class string.
   */
  scoreClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))
  }

  /**
   * The score cell's inline style (React's `{ minWidth: '1.5rem', textAlign: 'right' }`).
   * @returns The style attribute text.
   */
  scoreStyleText(): string | null {
    return styleText({ minWidth: '1.5rem', textAlign: 'right' })
  }

  /**
   * The track's inline style (React's track style object).
   * @returns The style attribute text.
   */
  trackStyleText(): string | null {
    return styleText({
      height: `${BAR_HEIGHT_PX}px`,
      borderRadius: `${BAR_RADIUS_PX}px`,
      background: 'var(--mol-color-surface-variant, rgba(127, 127, 127, 0.18))',
      overflow: 'hidden',
      flex: '1 1 0%',
    })
  }

  /**
   * One row's filled bar style (React's fill style object).
   * @param bucket - The row.
   * @returns The style attribute text.
   */
  fillStyleText(bucket: NpsBucket): string | null {
    const max = this.maxBucket()
    const widthPct = max === 0 ? 0 : Math.max(0, (bucket.count / max) * 100)
    return styleText({
      width: `${widthPct}%`,
      height: '100%',
      background: TIER_COLOR_VAR[bucket.tier],
      borderRadius: `${BAR_RADIUS_PX}px`,
      transition: 'width 200ms ease',
    })
  }

  /**
   * The count cell's class list (React's `cm.cn(cm.textSize('sm'))`).
   * @returns The class string.
   */
  countClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'))
  }

  /**
   * The count cell's inline style (React's `{ minWidth: '2rem' }`).
   * @returns The style attribute text.
   */
  countStyleText(): string | null {
    return styleText({ minWidth: '2rem' })
  }

  /**
   * The score line's class list (React's `cm.flex({ align: 'baseline', gap: 'sm' })`).
   * @returns The class string.
   */
  scoreLineClasses(): string {
    return this.cm().flex({ align: 'baseline', gap: 'sm' })
  }

  /**
   * The score-line label's class list (React's `cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))`).
   * @returns The class string.
   */
  scoreLabelClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))
  }

  /**
   * The score value's class list (React's `cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))`).
   * @returns The class string.
   */
  scoreValueClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))
  }

  /**
   * The responses label's class list (React's `cm.cn(cm.textSize('xs'))`).
   * @returns The class string.
   */
  responsesClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'))
  }

  /**
   * The responses label's inline style (React's `{ opacity: 0.7 }`).
   * @returns The style attribute text.
   */
  responsesStyleText(): string | null {
    return styleText({ opacity: '0.7' })
  }
}
