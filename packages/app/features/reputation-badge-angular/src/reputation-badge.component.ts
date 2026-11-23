/**
 * ReputationBadge component (React parity).
 *
 * @module
 */

import { Component, ElementRef, inject, ViewChild } from '@angular/core'

import {
  MolPlacement,
  placeElementBefore,
  setElementPresent,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Badge } from '@molecule/app-ui-angular'

import { colorForLevel, DEFAULT_THRESHOLDS, levelForScore } from './levels.js'
import type { ReputationLevel, ReputationThresholds } from './types.js'

/**
 * Compact-thousands formatter — keeps the badge readable at large scores.
 *
 * Examples: `42` → `"42"`, `1500` → `"1.5k"`, `12300` → `"12.3k"`,
 * `1_250_000` → `"1.3m"`.
 *
 * @param score - The score to format.
 * @returns A short human-readable string.
 */
function formatScore(score: number): string {
  if (!Number.isFinite(score)) return '0'
  const sign = score < 0 ? '-' : ''
  const abs = Math.abs(score)
  if (abs >= 1_000_000) {
    return `${sign}${trimZero((abs / 1_000_000).toFixed(1))}m`
  }
  if (abs >= 1_000) {
    return `${sign}${trimZero((abs / 1_000).toFixed(1))}k`
  }
  return `${sign}${Math.round(abs)}`
}

/**
 * Drop a trailing `.0` from a fixed-precision number string.
 *
 * @param s - The fixed-precision string (e.g. `"1.0"`).
 * @returns The cleaned string (e.g. `"1"`).
 */
function trimZero(s: string): string {
  return s.endsWith('.0') ? s.slice(0, -2) : s
}

/**
 * ReputationBadge component.
 *
 * User reputation / karma display: a numeric score paired with a tier chip
 * whose color reflects the derived (or explicit) level. React's root element
 * flips between `<span>` (compact) and `<div>` (full), so the rendered root
 * stands in front of the host's place and the host itself leaves the page
 * (`placeElementBefore` + `setElementPresent`): the rendered root is the only
 * element of React's DOM.
 *
 * Tier color comes from the active ClassMap bond's `cm.badge()` helper, so apps
 * swapping styling libraries restyle these chips for free.
 */
@Component({
  selector: 'mol-reputation-badge',
  standalone: true,
  imports: [Badge],
  hostDirectives: [MolPlacement],
  inputs: ['score', 'level', 'thresholds', 'variant', 'className'],
  template: `@if (isFull()) {
      <div
        #full
        [class]="fullClasses()"
        [attr.aria-label]="ariaLabel()"
        data-mol-id="reputation-badge"
      >
        <span [class]="captionClasses()">{{ caption() }}</span>
        <div [class]="rowClasses()" data-mol-id="reputation-badge-row">
          <span [class]="fullScoreClasses()" data-mol-id="reputation-badge-score">{{
            formattedScore()
          }}</span>
          <span mol-badge [color]="tierColor()">{{ levelLabelText() }}</span>
        </div>
      </div>
    } @else {
      <span
        #compact
        [class]="compactClasses()"
        [attr.aria-label]="ariaLabel()"
        data-mol-id="reputation-badge"
      >
        <span [class]="compactScoreClasses()" data-mol-id="reputation-badge-score">{{
          formattedScore()
        }}</span>
        <span mol-badge [color]="tierColor()">{{ levelLabelText() }}</span>
      </span>
    }`,
})
export class ReputationBadge {
  /** Numeric reputation / karma score. */
  score!: number
  /** Explicit reputation level (derived from `score` when omitted). */
  level?: ReputationLevel
  /** Override the default score → level thresholds. */
  thresholds?: ReputationThresholds
  /** Layout variant: `'compact'` (default) or `'full'`. */
  variant?: 'compact' | 'full'
  /** Extra classes merged onto the outer wrapper. */
  className?: string

  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()

  /** React's full-variant root (`<div>`), while that variant renders. */
  @ViewChild('full') private full?: ElementRef<HTMLElement>
  /** React's compact-variant root (`<span>`), while that variant renders. */
  @ViewChild('compact') private compact?: ElementRef<HTMLElement>

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  constructor() {
    // React's root element flips with the variant: whichever renders stands in front of
    // the host's place, and the host itself leaves the page.
    usePlacement(() => {
      const root = this.full?.nativeElement ?? this.compact?.nativeElement
      if (root) placeElementBefore(root, this.host.nativeElement)
      setElementPresent(this.host.nativeElement, false)
    })
  }

  /**
   * Whether React renders the full (stacked) variant.
   * @returns True only for `variant === 'full'`.
   */
  isFull(): boolean {
    return this.variant === 'full'
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The resolved reputation level (React's `level ?? levelForScore(...)`).
   * @returns The level.
   */
  resolvedLevel(): ReputationLevel {
    return this.level ?? levelForScore(this.score, this.thresholds ?? DEFAULT_THRESHOLDS)
  }

  /**
   * The tier chip's semantic color.
   * @returns The Badge color.
   */
  tierColor(): ReturnType<typeof colorForLevel> {
    return colorForLevel(this.resolvedLevel())
  }

  /**
   * The translated level label — exactly React's `levelLabel`: one LITERAL i18n
   * key per in-contract level, and the literal `reputationBadge.level.fallback`
   * key (whose English is the bare `{{level}}` placeholder, so an unknown id
   * renders as itself) for anything else.
   *
   * Literal keys, never one built from the level id: the i18n gate can only see
   * literal keys, so a key built at runtime that no locale bond carries leaves
   * every non-English user on English with nothing reporting it.
   * @returns The label text.
   */
  levelLabelText(): string {
    switch (this.resolvedLevel()) {
      case 'newcomer':
        return this.i18n.t('reputationBadge.level.newcomer', {}, { defaultValue: 'Newcomer' })
      case 'contributor':
        return this.i18n.t('reputationBadge.level.contributor', {}, { defaultValue: 'Contributor' })
      case 'trusted':
        return this.i18n.t('reputationBadge.level.trusted', {}, { defaultValue: 'Trusted' })
      case 'veteran':
        return this.i18n.t('reputationBadge.level.veteran', {}, { defaultValue: 'Veteran' })
      case 'legend':
        return this.i18n.t('reputationBadge.level.legend', {}, { defaultValue: 'Legend' })
      default:
        return this.i18n.t(
          'reputationBadge.level.fallback',
          { level: this.resolvedLevel() },
          { defaultValue: '{{level}}' },
        )
    }
  }

  /**
   * The formatted score.
   * @returns The compact score string.
   */
  formattedScore(): string {
    return formatScore(this.score)
  }

  /**
   * The "Reputation" caption above the full variant's row.
   * @returns The caption text.
   */
  caption(): string {
    return this.i18n.t('reputationBadge.caption', {}, { defaultValue: 'Reputation' })
  }

  /**
   * The root's accessible label (score and level).
   * @returns The `aria-label`.
   */
  ariaLabel(): string {
    return this.i18n.t(
      'reputationBadge.aria',
      { score: this.formattedScore(), level: this.levelLabelText() },
      { defaultValue: '{{score}} reputation, {{level}}' },
    )
  }

  /**
   * The compact root's class list.
   * @returns The class string.
   */
  compactClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.flex({ align: 'center', gap: 'xs' }), this.className)
  }

  /**
   * The full root's class list.
   * @returns The class string.
   */
  fullClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.stack(1), this.className)
  }

  /**
   * The full variant's caption class list.
   * @returns The class string.
   */
  captionClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('xs'), cm.fontWeight('medium'))
  }

  /**
   * The full variant's row class list.
   * @returns The class string.
   */
  rowClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'sm' })
  }

  /**
   * The full variant's score class list.
   * @returns The class string.
   */
  fullScoreClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))
  }

  /**
   * The compact variant's score class list.
   * @returns The class string.
   */
  compactScoreClasses(): string {
    return this.cm().cn(this.cm().fontWeight('semibold'))
  }
}
