/**
 * BiasIndicator component (React parity).
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  type DoCheck,
  ElementRef,
  inject,
  ViewChild,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { BiasBucket, ReliabilityTier } from './types.js'

/**
 * Clamp a number into the inclusive `[min, max]` range.
 *
 * @param value - Value to clamp.
 * @param min - Lower bound.
 * @param max - Upper bound.
 * @returns The clamped value.
 */
export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  if (value < min) return min
  if (value > max) return max
  return value
}

/**
 * Map a `-1..1` bias scalar into a coarse five-bucket label used for
 * accessibility and colouring. Boundaries: `<= -0.6` far-left,
 * `<= -0.2` left, `< 0.2` center, `< 0.6` right, otherwise far-right.
 *
 * @param bias - Bias scalar (clamped to `[-1, 1]` first).
 * @returns The bias bucket.
 */
export function biasToBucket(bias: number): BiasBucket {
  const b = clamp(bias, -1, 1)
  if (b <= -0.6) return 'far-left'
  if (b <= -0.2) return 'left'
  if (b < 0.2) return 'center'
  if (b < 0.6) return 'right'
  return 'far-right'
}

/**
 * Map a `0..1` reliability score into a four-tier label. Boundaries:
 * `>= 0.75` high, `>= 0.5` medium, `>= 0.25` low, otherwise disputed.
 *
 * @param reliability - Reliability scalar (clamped to `[0, 1]` first).
 * @returns The reliability tier.
 */
export function reliabilityToTier(reliability: number): ReliabilityTier {
  const r = clamp(reliability, 0, 1)
  if (r >= 0.75) return 'high'
  if (r >= 0.5) return 'medium'
  if (r >= 0.25) return 'low'
  return 'disputed'
}

/**
 * Convert a `-1..1` bias value into a `0..100` percent offset for
 * absolute positioning along the scale track.
 *
 * @param bias - Bias scalar (clamped to `[-1, 1]` first).
 * @returns The percent offset from the left edge of the track.
 */
export function biasToPercent(bias: number): number {
  return ((clamp(bias, -1, 1) + 1) / 2) * 100
}

/**
 * Resolve the marker colour for a given bias bucket. Uses semantic CSS
 * custom properties so swapping themes / styling libraries does not
 * require touching this component.
 *
 * @param bucket - Bias bucket.
 * @returns A `var(--…)` CSS color string.
 */
export function bucketColor(bucket: BiasBucket): string {
  switch (bucket) {
    case 'far-left':
      return 'var(--color-info, #2563eb)'
    case 'left':
      return 'var(--color-info-light, #60a5fa)'
    case 'center':
      return 'var(--color-foreground-secondary, #6b7280)'
    case 'right':
      return 'var(--color-warning-light, #fbbf24)'
    case 'far-right':
      return 'var(--color-error, #dc2626)'
  }
}

/**
 * Resolve the dot colour for a given reliability tier.
 *
 * @param tier - Reliability tier.
 * @returns A `var(--…)` CSS color string.
 */
export function tierColor(tier: ReliabilityTier): string {
  switch (tier) {
    case 'high':
      return 'var(--color-success, #16a34a)'
    case 'medium':
      return 'var(--color-info, #2563eb)'
    case 'low':
      return 'var(--color-warning, #d97706)'
    case 'disputed':
      return 'var(--color-error, #dc2626)'
  }
}

/** i18n key per bias bucket. */
const BIAS_KEY: Record<BiasBucket, string> = {
  'far-left': 'biasIndicator.bias.farLeft',
  left: 'biasIndicator.bias.leftLeaning',
  center: 'biasIndicator.bias.center',
  right: 'biasIndicator.bias.rightLeaning',
  'far-right': 'biasIndicator.bias.farRight',
}

/** English fallback per bias bucket. */
const BIAS_FALLBACK: Record<BiasBucket, string> = {
  'far-left': 'Far left',
  left: 'Left-leaning',
  center: 'Center',
  right: 'Right-leaning',
  'far-right': 'Far right',
}

/** i18n key per reliability tier. */
const TIER_KEY: Record<ReliabilityTier, string> = {
  high: 'biasIndicator.reliability.high',
  medium: 'biasIndicator.reliability.medium',
  low: 'biasIndicator.reliability.low',
  disputed: 'biasIndicator.reliability.disputed',
}

/** English fallback per reliability tier. */
const TIER_FALLBACK: Record<ReliabilityTier, string> = {
  high: 'Reliability: high',
  medium: 'Reliability: medium',
  low: 'Reliability: low',
  disputed: 'Reliability: disputed',
}

/** The baked-in scale gradient: info → info-light → neutral → warning → error. */
const SCALE_GRADIENT =
  'linear-gradient(to right, var(--color-info, #2563eb) 0%, var(--color-info-light, #60a5fa) 25%, var(--color-foreground-secondary, #9ca3af) 50%, var(--color-warning-light, #fbbf24) 75%, var(--color-error, #dc2626) 100%)'

/**
 * Whether an element captured any element or non-blank text node.
 *
 * @param el - The element.
 * @returns True when at least one projected node exists.
 */
const hasNodes = (el: Element): boolean => {
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === 1) return true
    if (node.nodeType === 3 && (node.textContent ?? '').trim()) return true
  }
  return false
}

/**
 * BiasIndicator component.
 *
 * Political-bias / source-credibility indicator: a horizontal `-1..+1` scale
 * with a coloured marker at `bias`, an optional reliability dot/chip below,
 * and a compact single-dot variant for dense lists. The host is a wrapper the
 * DOM normalizer unwraps (`data-parity-unwrap`) because React's root element
 * flips between `<div>` and the compact `<span>`; the rendered root is the
 * only child of the host, exactly React's root.
 *
 * React's `sourceLabel` node prop is projected content in Angular: pass it as
 * `[slot=sourceLabel]` content, and the caption element exists only when
 * something was projected — the same rule React follows with
 * `sourceLabel !== undefined`.
 */
@Component({
  selector: 'mol-bias-indicator',
  standalone: true,
  inputs: ['bias', 'reliability', 'compact', 'className', 'dataMolId'],
  host: { 'data-parity-unwrap': '', style: 'display: contents' },
  // prettier-ignore
  template: `<div #fullRoot [attr.data-mol-id]="containerId()" [attr.data-bias-bucket]="bucket()" [attr.data-reliability-tier]="tier()" [class]="rootClasses()"><span #fullSource data-mol-id="bias-indicator-source" [class]="sourceClasses()"><ng-content select="[slot=sourceLabel]"></ng-content></span><div role="img" [attr.aria-label]="biasLabel()" data-mol-id="bias-indicator-scale" [class]="scaleClasses()" [style]="scaleStyle()"><span data-mol-id="bias-indicator-marker" aria-hidden="true" [class]="markerClasses()" [style]="markerStyle()"></span></div><div [class]="rowClasses()"><span data-mol-id="bias-indicator-bias-label" [class]="biasLabelClasses()">{{ biasLabel() }}</span>@if (tier()) {<span data-mol-id="bias-indicator-reliability" [attr.data-reliability-tier]="tier()" [class]="chipClasses()"><span aria-hidden="true" [class]="dotClasses()" [style]="tierDotStyle()"></span><span>{{ tierLabel() }}</span></span>}</div></div>
    <span #compactRoot role="img" [attr.aria-label]="compactAriaLabel()" [attr.data-mol-id]="containerId()" [attr.data-bias-bucket]="bucket()" [attr.data-reliability-tier]="tier()" [class]="compactClasses()"><span aria-hidden="true" [class]="dotClasses()" [style]="dotStyle()"></span><span #compactSource [class]="compactSourceClasses()"><ng-content select="[slot=sourceLabel]"></ng-content></span></span>`,
})
export class BiasIndicator implements AfterViewInit, DoCheck {
  /** Bias scalar (-1 far left … +1 far right). */
  bias!: number
  /** Optional 0..1 reliability score. */
  reliability?: number
  /** Render only the coloured dot. */
  compact?: boolean
  /** Extra classes on the root element. */
  className?: string
  /** `data-mol-id` for AI-agent / E2E selectors. */
  dataMolId?: string

  /** The non-compact root (`<div>`). */
  @ViewChild('fullRoot') private fullRoot?: ElementRef<HTMLElement>
  /** The non-compact source caption (React renders it only when present). */
  @ViewChild('fullSource') private fullSource?: ElementRef<HTMLElement>
  /** The compact root (`<span>`). */
  @ViewChild('compactRoot') private compactRoot?: ElementRef<HTMLElement>
  /** The compact source caption. */
  @ViewChild('compactSource') private compactSource?: ElementRef<HTMLElement>

  /** The host element (the unwrapped wrapper holding React's root). */
  private readonly host: HTMLElement = inject(ElementRef<HTMLElement>).nativeElement

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
   * The current bias bucket.
   * @returns The bias bucket.
   */
  bucket(): BiasBucket {
    return biasToBucket(this.bias)
  }

  /**
   * The translated bias label.
   * @returns The label.
   */
  biasLabel(): string {
    const bucket = this.bucket()
    return this.i18n.t(BIAS_KEY[bucket], {}, { defaultValue: BIAS_FALLBACK[bucket] })
  }

  /**
   * The current reliability tier, or null when no score was given.
   * @returns The tier or null.
   */
  tier(): ReliabilityTier | null {
    return this.reliability !== undefined ? reliabilityToTier(this.reliability) : null
  }

  /**
   * The translated reliability label, or null without a tier.
   * @returns The label or null.
   */
  tierLabel(): string | null {
    const tier = this.tier()
    return tier ? this.i18n.t(TIER_KEY[tier], {}, { defaultValue: TIER_FALLBACK[tier] }) : null
  }

  /**
   * The `data-mol-id` on the root (React's default parameter).
   * @returns The root's `data-mol-id`.
   */
  containerId(): string {
    return this.dataMolId ?? 'bias-indicator'
  }

  /**
   * The compact root's accessible label (bias, plus the tier when set).
   * @returns The `aria-label`.
   */
  compactAriaLabel(): string {
    const label = this.biasLabel()
    const tier = this.tierLabel()
    return tier ? `${label} — ${tier}` : label
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
   * The non-compact root's class list.
   * @returns The class string.
   */
  rootClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.flex({ direction: 'col', gap: 'xs' }), this.className)
  }

  /**
   * A coloured dot's class list (`cm.cn(cm.w(2), cm.h(2), cm.roundedFull, cm.displayInlineBlock)`).
   * @returns The class string.
   */
  dotClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.w(2), cm.h(2), cm.roundedFull, cm.displayInlineBlock)
  }

  /**
   * The compact source caption's class list (`cm.cn(cm.textSize('xs'), cm.textMuted)`).
   * @returns The class string.
   */
  compactSourceClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('xs'), cm.textMuted)
  }

  /**
   * The non-compact source caption's class list.
   * @returns The class string.
   */
  sourceClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))
  }

  /**
   * The scale track's class list.
   * @returns The class string.
   */
  scaleClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.position('relative'), cm.h(2))
  }

  /**
   * The marker's class list.
   * @returns The class string.
   */
  markerClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.position('absolute'), cm.roundedFull)
  }

  /**
   * The label row's class list.
   * @returns The class string.
   */
  rowClasses(): string {
    const cm = this.cm()
    return cm.flex({ align: 'center', justify: 'between', gap: 'xs' })
  }

  /**
   * The bias label's class list.
   * @returns The class string.
   */
  biasLabelClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'))
  }

  /**
   * The reliability chip's class list.
   * @returns The class string.
   */
  chipClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.textSize('xs'))
  }

  /**
   * The bias dot's inline style.
   * @returns The declarations.
   */
  dotStyle(): string {
    return `background: ${bucketColor(this.bucket())}`
  }

  /**
   * The reliability dot's inline style.
   * @returns The declarations.
   */
  tierDotStyle(): string {
    const tier = this.tier()
    return `background: ${tier ? tierColor(tier) : ''}`
  }

  /**
   * The scale track's inline style.
   * @returns The declarations.
   */
  scaleStyle(): string {
    return `width: 100%; min-width: 80px; border-radius: 999px; background: ${SCALE_GRADIENT}; opacity: 0.45`
  }

  /**
   * The marker's inline style, positioned at `biasToPercent(bias)%`.
   * @returns The declarations.
   */
  markerStyle(): string {
    return `left: ${biasToPercent(this.bias)}%; top: 50%; transform: translate(-50%, -50%); width: 12px; height: 12px; background: ${bucketColor(this.bucket())}; border: 2px solid var(--color-surface, #ffffff); box-shadow: 0 0 0 1px var(--color-border, rgba(0,0,0,0.15))`
  }

  /**
   * Renders React's single root: attaches the branch the props select and
   * detaches the other, then drops a caption element nothing was projected
   * into (React renders it only when `sourceLabel !== undefined`).
   */
  ngAfterViewInit(): void {
    // The first `ngDoCheck` runs BEFORE Angular projects the slot content into
    // the caption spans, so reconciling then would drop spans that are about to
    // receive nodes. Only the passes that follow see the projection.
    this.viewReady = true
    this.reconcile()
  }

  /**
   * Re-reconciles on later passes (a props step may toggle `compact` or the
   * reliability score); the projected caption never changes.
   */
  ngDoCheck(): void {
    if (this.viewReady) this.reconcile()
  }

  /** Whether the view (and its projected slot content) exists yet. */
  private viewReady = false

  /** Applies React's root/caption conditions to the two mounted branches. */
  private reconcile(): void {
    const full = this.fullRoot?.nativeElement
    const compact = this.compactRoot?.nativeElement
    if (!full || !compact) return
    const active = this.compact === true ? compact : full
    const inactive = active === compact ? full : compact
    const fullSource = this.fullSource?.nativeElement
    const compactSource = this.compactSource?.nativeElement
    const activeSource = active === compact ? compactSource : fullSource
    // The caption's projected nodes sit in whichever capture span holds them;
    // move them into the branch that renders, before deciding to keep it.
    const donor = [fullSource, compactSource].find((el) => el !== undefined && hasNodes(el))
    if (donor && activeSource && donor !== activeSource) {
      for (const node of Array.from(donor.childNodes)) activeSource.appendChild(node)
    }
    for (const el of [fullSource, compactSource]) {
      if (!el) continue
      if (!hasNodes(el)) {
        if (el.isConnected) el.remove()
        continue
      }
      if (el === fullSource && el.parentElement !== full) full.insertBefore(el, full.firstChild)
      if (el === compactSource && el.parentElement !== compact) compact.appendChild(el)
    }
    if (!active.isConnected) this.host.appendChild(active)
    if (inactive.isConnected) inactive.remove()
  }
}
