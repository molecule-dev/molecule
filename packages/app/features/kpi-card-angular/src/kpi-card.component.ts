/**
 * KpiCard component (React parity).
 *
 * @module
 */

import { Component, type ElementRef, ViewChild } from '@angular/core'

import {
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  type SlotReader,
  usePlacement,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { KpiCardAccentSide } from './types.js'

/**
 * KpiCard component.
 *
 * Single dashboard metric card. The host IS the outer Card `<div>`
 * (`div[mol-kpi-card]`), matching React's root exactly: React renders
 * `<Card className data-mol-id>` — whose Card defaults are variant `elevated`
 * and padding `md` — so the host wears that same class list. The label, value,
 * icon, trend, subtitle and action are projected content (`[slot=title]`,
 * `[slot=value]`, …), because an Angular input cannot carry a node.
 *
 * React renders the trend/subtitle row only when one of the two is supplied;
 * Angular cannot ask a projection whether it matched, so the row is rendered
 * once, its slots are read at view init, and the empty row (and an absent
 * subtitle wrapper) is removed — the reference DOM has no trace of them.
 */
@Component({
  selector: 'div[mol-kpi-card]',
  standalone: true,
  hostDirectives: [MolPlacement],
  inputs: [
    'accentSide',
    'accentColor',
    'upperLabel',
    'emphasizeValue',
    'hoverLift',
    'className',
    'dataMolId',
  ],
  host: {
    '[class]': 'classes()',
    '[attr.data-mol-id]': 'dataMolId ?? null',
  },
  // prettier-ignore
  template: `<div [class]="stackClasses()"><div [class]="headerClasses()"><div [class]="innerClasses()"><ng-content select="[slot=icon]"></ng-content><span [class]="titleClasses()"><ng-content select="[slot=title]"></ng-content></span></div><ng-content select="[slot=action]"></ng-content></div><div [class]="valueClasses()"><ng-content select="[slot=value]"></ng-content></div><div #trendRow [class]="innerClasses()"><span #trendSlot><ng-content select="[slot=trend]"></ng-content></span><span #subtitleSlot [class]="subtitleClasses()"><ng-content select="[slot=subtitle]"></ng-content></span></div></div>`,
})
export class KpiCard {
  /** Where to draw the accent bar (defaults to `'none'` at read time). */
  accentSide?: KpiCardAccentSide
  /** The accent bar's color class (defaults to the ClassMap's accent color). */
  accentColor?: string
  /** Uppercase, tracked label styling. */
  upperLabel?: boolean
  /** Extrabold value weight. */
  emphasizeValue?: boolean
  /** Subtle hover lift. */
  hoverLift?: boolean
  /** Extra classes on the outer Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string

  /** The trend/subtitle row. */
  @ViewChild('trendRow') trendRow?: ElementRef<HTMLElement>
  /** The trend slot's capture span (removed once its nodes are placed). */
  @ViewChild('trendSlot') trendSlot?: ElementRef<HTMLSpanElement>
  /** The subtitle slot's wrapper span. */
  @ViewChild('subtitleSlot') subtitleSlot?: ElementRef<HTMLSpanElement>

  constructor() {
    usePlacement((hasContent) => this.reconcile(hasContent))
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The effective accent side (React's `accentSide = 'none'` default).
   * @returns The accent side.
   */
  accentSideValue(): KpiCardAccentSide {
    return this.accentSide ?? 'none'
  }

  /**
   * The accent bar's color class (React's default: the ClassMap's accent color).
   * @returns The color class.
   */
  accentColorValue(): string {
    return this.accentColor ?? this.cm().kpiCardAccentColor
  }

  /**
   * The accent bar's class list for the effective side (empty for `'none'`).
   * @returns The class string.
   */
  accentClasses(): string {
    return this.accentSideValue() === 'left'
      ? this.cm().cn(this.cm().kpiCardAccentLeft, this.accentColorValue())
      : this.accentSideValue() === 'top'
        ? this.cm().cn(this.cm().kpiCardAccentTop, this.accentColorValue())
        : ''
  }

  /**
   * The hover-lift class, when asked for.
   * @returns The class string.
   */
  liftClasses(): string {
    return this.hoverLift ? this.cm().kpiCardHoverLift : ''
  }

  /**
   * The host's class list: the Card surface React renders (variant `elevated`,
   * padding `md`, not interactive) plus the accent, the lift and `className`.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().card({ variant: 'elevated' }),
      this.cm().cardPadding('md'),
      this.accentClasses(),
      this.liftClasses(),
      this.className,
    )
  }

  /**
   * The body class (`cm.stack(3)`).
   * @returns The class string.
   */
  stackClasses(): string {
    return this.cm().stack(3)
  }

  /**
   * The header row class (`cm.flex` between, centered, small gap).
   * @returns The class string.
   */
  headerClasses(): string {
    return this.cm().flex({ justify: 'between', align: 'center', gap: 'sm' })
  }

  /**
   * The icon/title row and trend row class (`cm.flex` centered, small gap).
   * @returns The class string.
   */
  innerClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'sm' })
  }

  /**
   * The label class: uppercase-tracked when `upperLabel`, else sentence case.
   * @returns The class string.
   */
  titleClasses(): string {
    return this.upperLabel
      ? this.cm().cn(
          this.cm().cn(
            this.cm().textSize('xs'),
            this.cm().fontWeight('bold'),
            this.cm().kpiCardTitleUppercase,
          ),
        )
      : this.cm().cn(this.cm().textSize('sm'), this.cm().fontWeight('medium'))
  }

  /**
   * The value class: extra-large, bold or extrabold.
   * @returns The class string.
   */
  valueClasses(): string {
    return this.cm().cn(
      this.cm().textSize('3xl'),
      this.emphasizeValue ? this.cm().fontWeight('extrabold') : this.cm().fontWeight('bold'),
    )
  }

  /**
   * The subtitle class (`cm.textSize('sm')`).
   * @returns The class string.
   */
  subtitleClasses(): string {
    return this.cm().textSize('sm')
  }

  /**
   * Reads the trend/subtitle slots, moves the trend's projected nodes to its
   * position, removes the wrapper the reference DOM does not have, and drops
   * the row entirely when both slots are empty — React renders the row only
   * when `trend || subtitle` is supplied.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private reconcile(hasContent: SlotReader): void {
    const trend = this.trendSlot?.nativeElement
    const subtitle = this.subtitleSlot?.nativeElement
    const row = this.trendRow?.nativeElement
    // Read presence BEFORE relocating: the placement moves the projected nodes out.
    const trendPresent = trend ? hasContent(trend) : false
    const subtitlePresent = subtitle ? hasContent(subtitle) : false
    if (trend) this.relocate(trend)
    setElementPresent(subtitle, subtitlePresent)
    setElementPresent(row, trendPresent || subtitlePresent)
  }

  /**
   * Moves one slot's projected nodes out of its capture span to the slot's
   * position — React renders `{trend}` with no wrapper element — and takes the
   * empty span out of the DOM. The content stands bare in front of the span's
   * own place, so it follows wherever Angular puts the span.
   *
   * @param span - The capture span.
   */
  private relocate(span: HTMLSpanElement): void {
    placeContentBefore(span, span)
    setElementPresent(span, false)
  }
}
