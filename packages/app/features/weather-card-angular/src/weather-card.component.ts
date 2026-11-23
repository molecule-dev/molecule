/**
 * WeatherCard component (React parity).
 *
 * @module
 */

import { type AfterViewInit, Component, type ElementRef, signal, ViewChild } from '@angular/core'

import { hasContent, placeContent, setElementPresent } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { WeatherAlertLevel, WeatherTracePoint } from './types.js'

/** The sparkline's fixed DECORATIVE path, used when the trace is absent or too short. */
const FALLBACK = {
  fill: 'M0,68 Q40,52 80,46 T160,38 T240,55 T320,28 T400,42 L400,100 L0,100 Z',
  stroke: 'M0,68 Q40,52 80,46 T160,38 T240,55 T320,28 T400,42',
}

/**
 * Computes SVG fill and stroke path data for the 24h temperature sparkline.
 *
 * @param trace - The trace, when the caller supplied one.
 * @returns The area `fill` path and the line `stroke` path.
 */
function buildSparkline(trace: ReadonlyArray<WeatherTracePoint> | undefined): {
  fill: string
  stroke: string
} {
  if (!trace || trace.length < 2) return FALLBACK
  const W = 400
  const H = 100
  const values = trace.map((p) => p.temperature)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W
    const y = H - ((v - min) / range) * (H * 0.85) - H * 0.1
    return [x, y] as const
  })
  const stroke = pts
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')
  const fill = `${stroke} L${W},${H} L0,${H} Z`
  return { fill, stroke }
}

/**
 * WeatherCard component.
 *
 * Atmospheric current-conditions hero. The host IS React's outer `<div>`
 * (`div[mol-weather-card]`), matching React's root exactly. React renders the
 * eyebrow, the feels-like label, the hi/lo chip, the updated label and the
 * alert badge's label only when each is supplied; an Angular input cannot
 * carry a node, so those five are projected content (`[slot=eyebrow]`,
 * `[slot=alertLabel]`, …). Each of the four optionals is rendered once, its
 * provision read at view init, and the wrapper the reference DOM does not have
 * is dropped — the badge's fallback text is switched by a signal.
 */
@Component({
  selector: 'div[mol-weather-card]',
  standalone: true,
  inputs: [
    'locationName',
    'region',
    'temperature',
    'feelsLike',
    'high',
    'low',
    'condition',
    'conditionIcon',
    'alertLevel',
    'unit',
    'trace',
    'className',
  ],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `<div [class]="contentClasses()"><div [class]="rowClasses()"><div><p #eyebrowWrap [class]="eyebrowClasses()"><span #eyebrowSlot><ng-content select="[slot=eyebrow]"></ng-content></span></p><h2 [class]="locationClasses()">{{ locationName }}</h2>@if (region) {<p [class]="regionClasses()">{{ region }}</p>}</div>@if (alertLevel) {<span [class]="alertClasses()"><span [class]="alertIconClasses()" aria-hidden="true">warning</span><span #alertLabelSlot><ng-content select="[slot=alertLabel]"></ng-content></span>@if (!labelFromSlot()) { {{ alertLabelText() }} }</span>}</div><div [class]="temperatureRowClasses()"><span [class]="temperatureClasses()" style="font-size: 4.5rem; font-weight: 200; letter-spacing: -0.03em; line-height: 1">{{ temperatureText() }}{{ unitText() }}</span><div [class]="conditionPillClasses()"><span [class]="conditionIconClasses()" style="font-variation-settings: 'FILL' 1" aria-hidden="true">{{ conditionIconText() }}</span>@if (condition) {<span [class]="conditionTextClasses()">{{ condition }}</span>}</div></div><div [class]="metaRowClasses()"><span #feelsLikeWrap [class]="feelsLikeClasses()"><span #feelsLikeSlot><ng-content select="[slot=feelsLikeLabel]"></ng-content></span></span><span #highLowWrap [class]="highLowClasses()"><span #highLowSlot><ng-content select="[slot=highLowLabel]"></ng-content></span></span><span #updatedWrap [class]="updatedClasses()"><span #updatedSlot><ng-content select="[slot=updatedLabel]"></ng-content></span></span></div></div><div [class]="sparklineWrapClasses()"><svg [class]="sparklineClasses()" viewBox="0 0 400 100" preserveAspectRatio="none" aria-hidden="true"><path [attr.d]="sparkline().fill" fill="white" opacity="0.25"></path><path [attr.d]="sparkline().stroke" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"></path></svg></div><div [class]="glowLargeClasses()" aria-hidden="true"></div><div [class]="glowSmallClasses()" aria-hidden="true"></div>`,
})
export class WeatherCard implements AfterViewInit {
  /** The location's display name. */
  locationName = ''
  /** Optional region line under the location. */
  region?: string | null
  /** Current temperature, rendered rounded. */
  temperature = 0
  /** Currently INERT — nothing renders it; pass the `feelsLikeLabel` slot instead. */
  feelsLike?: number | null
  /** Currently INERT — nothing renders it; pass the `highLowLabel` slot instead. */
  high?: number | null
  /** Currently INERT — nothing renders it; pass the `highLowLabel` slot instead. */
  low?: number | null
  /** Condition text shown inside the glass pill. */
  condition?: string | null
  /** material-symbols icon name (defaults to `'partly_cloudy_day'` at read time). */
  conditionIcon?: string
  /** Severity of the alert badge; no badge renders when it is nullish. */
  alertLevel?: WeatherAlertLevel | null
  /** Unit appended to the temperature (defaults to `'°F'` at read time). */
  unit?: string
  /** 24h trace driving the area sparkline. */
  trace?: ReadonlyArray<WeatherTracePoint>
  /** Extra classes on the outer wrapper. */
  className?: string

  /** The eyebrow's `<p>` wrapper (dropped when the slot is empty). */
  @ViewChild('eyebrowWrap') eyebrowWrap?: ElementRef<HTMLParagraphElement>
  /** The eyebrow slot's capture span (removed once its nodes are placed). */
  @ViewChild('eyebrowSlot') eyebrowSlot?: ElementRef<HTMLSpanElement>
  /** The alert label's capture span (removed once its nodes are placed). */
  @ViewChild('alertLabelSlot') alertLabelSlot?: ElementRef<HTMLSpanElement>
  /** The feels-like wrapper span (dropped when the slot is empty). */
  @ViewChild('feelsLikeWrap') feelsLikeWrap?: ElementRef<HTMLSpanElement>
  /** The feels-like slot's capture span. */
  @ViewChild('feelsLikeSlot') feelsLikeSlot?: ElementRef<HTMLSpanElement>
  /** The hi/lo chip wrapper span (dropped when the slot is empty). */
  @ViewChild('highLowWrap') highLowWrap?: ElementRef<HTMLSpanElement>
  /** The hi/lo slot's capture span. */
  @ViewChild('highLowSlot') highLowSlot?: ElementRef<HTMLSpanElement>
  /** The updated-label wrapper span (dropped when the slot is empty). */
  @ViewChild('updatedWrap') updatedWrap?: ElementRef<HTMLSpanElement>
  /** The updated-label slot's capture span. */
  @ViewChild('updatedSlot') updatedSlot?: ElementRef<HTMLSpanElement>

  /** Whether the alert badge's label came from projected content (no fallback text then). */
  private readonly labelFromSlot = signal(false)

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The outer wrapper's class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ direction: 'col', justify: 'between' }),
      this.cm().sp('p', 10),
      this.cm().weatherCardHero,
      this.className,
    )
  }

  /**
   * The content column's class (`cm.weatherCardContent`).
   * @returns The class string.
   */
  contentClasses(): string {
    return this.cm().cn(this.cm().weatherCardContent)
  }

  /**
   * The location/alert row's class.
   * @returns The class string.
   */
  rowClasses(): string {
    return this.cm().cn(this.cm().flex({ align: 'center', justify: 'between', gap: 'md' }))
  }

  /**
   * The eyebrow's class list.
   * @returns The class string.
   */
  eyebrowClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.fontWeight('bold'), cm.textSize('xs'), cm.sp('mb', 1), cm.weatherCardEyebrow)
  }

  /**
   * The location heading's class list.
   * @returns The class string.
   */
  locationClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('2xl'), cm.fontWeight('semibold'), cm.weatherCardLocation)
  }

  /**
   * The region line's class list.
   * @returns The class string.
   */
  regionClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('xs'), cm.sp('mt', 1), cm.weatherCardRegion)
  }

  /**
   * The alert badge's class list, including the level's tone.
   * @returns The class string.
   */
  alertClasses(): string {
    const cm = this.cm()
    const tone =
      this.alertLevel === 'watch'
        ? cm.weatherCardAlertWatch
        : this.alertLevel === 'warning'
          ? cm.weatherCardAlertWarning
          : cm.weatherCardAlertEmergency
    return cm.cn(
      cm.flex({ align: 'center', gap: 'xs' }),
      cm.sp('px', 3),
      cm.sp('py', 1),
      cm.roundedFull,
      cm.fontWeight('bold'),
      cm.weatherCardAlertBadge,
      tone,
    )
  }

  /**
   * The badge's warning glyph class list.
   * @returns The class string.
   */
  alertIconClasses(): string {
    return this.cm().cn(this.cm().iconGlyphFont, this.cm().textSize('sm'))
  }

  /**
   * The alert badge's fallback text (React's `alertLabel ?? alertLevel`).
   * @returns The label text.
   */
  alertLabelText(): string {
    return this.alertLevel ?? ''
  }

  /**
   * The temperature/condition row's class list.
   * @returns The class string.
   */
  temperatureRowClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.flex({ align: 'baseline', gap: 'lg' }), cm.sp('mt', 8))
  }

  /**
   * The temperature span's class list.
   * @returns The class string.
   */
  temperatureClasses(): string {
    return this.cm().cn(this.cm().weatherCardTemperature)
  }

  /**
   * The rounded temperature text (React's `Math.round(temperature)`).
   * @returns The temperature.
   */
  temperatureText(): number {
    return Math.round(this.temperature)
  }

  /**
   * The unit appended to the temperature (React's `unit = '°F'` default).
   * @returns The unit.
   */
  unitText(): string {
    return this.unit ?? '°F'
  }

  /**
   * The condition pill's class list.
   * @returns The class string.
   */
  conditionPillClasses(): string {
    const cm = this.cm()
    return cm.cn(
      cm.flex({ align: 'center', gap: 'sm' }),
      cm.sp('px', 3),
      cm.sp('py', 1),
      cm.roundedFull,
      cm.weatherCardConditionPill,
    )
  }

  /**
   * The condition glyph's class list.
   * @returns The class string.
   */
  conditionIconClasses(): string {
    return this.cm().cn(this.cm().iconGlyphFont, this.cm().textSize('2xl'))
  }

  /**
   * The condition glyph's ligature name (React's `conditionIcon` default).
   * @returns The icon name.
   */
  conditionIconText(): string | undefined {
    return this.conditionIcon ?? 'partly_cloudy_day'
  }

  /**
   * The condition text's class list.
   * @returns The class string.
   */
  conditionTextClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'))
  }

  /**
   * The label row's class list.
   * @returns The class string.
   */
  metaRowClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }), cm.sp('mt', 4))
  }

  /**
   * The feels-like label's class list.
   * @returns The class string.
   */
  feelsLikeClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), cm.weatherCardFeelsLike)
  }

  /**
   * The hi/lo chip's class list.
   * @returns The class string.
   */
  highLowClasses(): string {
    const cm = this.cm()
    return cm.cn(
      cm.flex({ align: 'center', gap: 'xs' }),
      cm.sp('px', 3),
      cm.sp('py', 1),
      cm.roundedFull,
      cm.textSize('xs'),
      cm.fontWeight('bold'),
      cm.weatherCardHighLowChip,
    )
  }

  /**
   * The updated label's class list.
   * @returns The class string.
   */
  updatedClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('xs'), cm.weatherCardUpdated)
  }

  /**
   * The sparkline container's class list.
   * @returns The class string.
   */
  sparklineWrapClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.sp('mt', 10), cm.h(24), cm.w('full'), cm.weatherCardContent)
  }

  /**
   * The sparkline `<svg>`'s class list.
   * @returns The class string.
   */
  sparklineClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.w('full'), cm.h('full'))
  }

  /**
   * The large glow's class list.
   * @returns The class string.
   */
  glowLargeClasses(): string {
    return this.cm().cn(this.cm().weatherCardGlowLarge)
  }

  /**
   * The small glow's class list.
   * @returns The class string.
   */
  glowSmallClasses(): string {
    return this.cm().cn(this.cm().weatherCardGlowSmall)
  }

  /**
   * The sparkline path data for the current trace.
   * @returns The area `fill` path and the line `stroke` path.
   */
  sparkline(): { fill: string; stroke: string } {
    return buildSparkline(this.trace)
  }

  /**
   * Reads the projected optionals (view queries resolve only at view init),
   * moves each slot's nodes to its position, drops the wrappers the reference
   * DOM does not have, and records whether the badge's label was projected.
   */
  ngAfterViewInit(): void {
    const eyebrow = this.eyebrowSlot?.nativeElement
    const eyebrowWrap = this.eyebrowWrap?.nativeElement
    if (eyebrow) {
      if (hasContent(eyebrow)) this.relocate(eyebrow)
      else setElementPresent(eyebrowWrap, false)
    }
    this.optional('feelsLike')
    this.optional('highLow')
    this.optional('updated')
    const alertLabel = this.alertLabelSlot?.nativeElement
    if (alertLabel) {
      const present = hasContent(alertLabel)
      // The capture span always goes: React renders the label (or the level's
      // name) with no wrapper element.
      this.relocate(alertLabel)
      this.labelFromSlot.set(present)
    }
  }

  /**
   * Reads one optional label's wrapper and slot: the nodes move to the slot's
   * position when it captured any, and the whole wrapper is dropped otherwise.
   *
   * @param name - The label's slot name prefix (`feelsLike`, `highLow`, `updated`).
   */
  private optional(name: 'feelsLike' | 'highLow' | 'updated'): void {
    const wrap =
      name === 'feelsLike'
        ? this.feelsLikeWrap?.nativeElement
        : name === 'highLow'
          ? this.highLowWrap?.nativeElement
          : this.updatedWrap?.nativeElement
    const slot =
      name === 'feelsLike'
        ? this.feelsLikeSlot?.nativeElement
        : name === 'highLow'
          ? this.highLowSlot?.nativeElement
          : this.updatedSlot?.nativeElement
    if (!slot) return
    if (hasContent(slot)) this.relocate(slot)
    else setElementPresent(wrap, false)
  }

  /**
   * Moves one slot's projected nodes out of its capture span to the slot's
   * position and takes the empty span out of the DOM — React renders the node
   * with no wrapper element.
   *
   * @param span - The capture span.
   */
  private relocate(span: HTMLSpanElement): void {
    const parent = span.parentNode
    if (!parent) return
    placeContent(span, parent, span)
    setElementPresent(span, false)
  }
}
