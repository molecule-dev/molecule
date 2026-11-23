/**
 * ProgressBar component (React parity).
 *
 * @module
 */

import type { ElementRef } from '@angular/core'
import { Component, signal, ViewChild } from '@angular/core'

import {
  MolPlacement,
  setElementPresent,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import type { ProgressBarProps } from './types.js'

/**
 * ProgressBar component.
 *
 * Labeled progress bar with optional value display: a `[label ... valueLabel]`
 * header row above a track, with the track and fill styled by the ClassMap
 * progress tokens. The host IS the outer `<div>` (`div[mol-progress-bar]`),
 * matching React's root exactly. Node props (`label`, `valueLabel`) are
 * projected content (`[slot=<name>]`) or plain string inputs.
 *
 * The track always carries an accessible name (`aria-progressbar-name`):
 * `labelledBy` when given, else the rendered `label`, else
 * `t('progressBar.label', undefined, { defaultValue: 'Progress' })`, read
 * through `useTranslation()` so it follows a locale switch.
 *
 * This is the Angular counterpart of `@molecule/app-progress-bar-react`: the
 * same props (React names), the same ClassMap tokens, and the same DOM for the
 * same input.
 *
 * @remarks
 * Angular projection needs the `<ng-content>` capture points mounted, so the
 * optional header regions stay in the template and leave the page while they
 * have nothing to render; the placement function re-decides them whenever a
 * slot changes (React would not render them at all).
 */
@Component({
  selector: 'div[mol-progress-bar]',
  standalone: true,
  hostDirectives: [MolPlacement],
  inputs: [
    'value',
    'max',
    'label',
    'valueLabel',
    'labelledBy',
    'describedBy',
    'size',
    'color',
    'className',
  ],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `<div #headerEl [class]="headerClasses()"><span #labelEl [attr.id]="nameByLabel ? labelId : null" [class]="labelClasses()">@if (hasLabel) {{{ label }}}<ng-content select="[slot=label]" /></span><span #valueLabelEl [class]="valueLabelClasses()">@if (hasValueLabel) {{{ valueLabel }}}<ng-content select="[slot=valueLabel]" /></span></div><div [class]="trackClasses()" role="progressbar" [attr.aria-valuenow]="value" [attr.aria-valuemin]="0" [attr.aria-valuemax]="maxValue()" [attr.aria-labelledby]="trackLabelledBy" [attr.aria-label]="trackAriaLabel" [attr.aria-describedby]="describedBy"><div [class]="fillClasses()" [style]="fillStyleText()"></div></div>`,
})
export class ProgressBar {
  /** Current numeric value. */
  value!: number
  /** Maximum (defaults to `100` at read time). */
  max?: number
  /** Optional label rendered above the track — a string input, or `[slot=label]` content. */
  label?: ProgressBarProps['label']
  /** Optional value display on the right of the label row — a string input, or `[slot=valueLabel]` content. */
  valueLabel?: ProgressBarProps['valueLabel']
  /** Element id the track is named by — wins over `label` and the default name. */
  labelledBy?: string
  /** Element id the track is described by (`aria-describedby`). */
  describedBy?: string
  /** Size preset — maps to ClassMap `progressHeight` (defaults to `'md'`). */
  size?: 'sm' | 'md' | 'lg'
  /** Color variant — maps to ClassMap `progressColor` (defaults to `'primary'`). */
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info'
  /** Extra classes on the outer wrapper. */
  className?: string

  /** Per-instance counter backing {@link ProgressBar.labelId} (React numbers `useId()` ids). */
  private static nextId = 0
  /** The id the track's `aria-labelledby` points at when the rendered label names it. */
  readonly labelId = `mol-progress-bar-name-${ProgressBar.nextId++}`
  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()

  /** The header row (present while either optional region renders). */
  @ViewChild('headerEl', { static: true }) private headerEl?: ElementRef<HTMLElement>
  /** The optional label span (its projected nodes decide whether it shows). */
  @ViewChild('labelEl', { static: true }) private labelEl?: ElementRef<HTMLSpanElement>
  /** The optional value-label span (its projected nodes decide whether it shows). */
  @ViewChild('valueLabelEl', { static: true }) private valueLabelEl?: ElementRef<HTMLSpanElement>

  /** Whether a `[slot=label]` projection landed (placement decides). */
  private readonly labelShown = signal(false)
  /** Whether a `[slot=valueLabel]` projection landed (placement decides). */
  private readonly valueLabelShown = signal(false)

  /**
   * Keeps the header row and its two optional regions on the page only while
   * they render a text input or projected content, re-decided whenever either
   * changes (a slot taken away and given back included).
   */
  constructor() {
    usePlacement((hasContent) => {
      const labelEl = this.labelEl?.nativeElement
      const valueLabelEl = this.valueLabelEl?.nativeElement
      const showLabel = this.hasLabel || (labelEl ? hasContent(labelEl) : false)
      const showValueLabel = this.hasValueLabel || (valueLabelEl ? hasContent(valueLabelEl) : false)
      this.labelShown.set(showLabel)
      this.valueLabelShown.set(showValueLabel)
      setElementPresent(labelEl, showLabel)
      setElementPresent(valueLabelEl, showValueLabel)
      setElementPresent(this.headerEl?.nativeElement, showLabel || showValueLabel)
    })
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Whether a text label input renders (React's `label && …`).
   * @returns True when the label renders as text.
   */
  get hasLabel(): boolean {
    return this.label !== undefined && this.label !== null && !!this.label
  }

  /**
   * Whether a text value-label input renders (React's `valueLabel && …`).
   * @returns True when the value label renders as text.
   */
  get hasValueLabel(): boolean {
    return this.valueLabel !== undefined && this.valueLabel !== null && !!this.valueLabel
  }

  /**
   * Whether the label span renders: a truthy text input or a `[slot=label]` projection.
   * @returns True when the label shows.
   */
  get showLabel(): boolean {
    return this.hasLabel || this.labelShown()
  }

  /**
   * Whether the value-label span renders.
   * @returns True when the value label shows.
   */
  get showValueLabel(): boolean {
    return this.hasValueLabel || this.valueLabelShown()
  }

  /**
   * Whether the header row renders at all (React's `(label || valueLabel)`).
   * @returns True when the header row shows.
   */
  get showHeader(): boolean {
    return this.showLabel || this.showValueLabel
  }

  /**
   * Whether the rendered label is the track's name (React names the track with
   * the `label` unless an explicit `labelledBy` wins).
   * @returns True when the label span carries the track's `aria-labelledby` id.
   */
  get nameByLabel(): boolean {
    return this.labelledBy === undefined && this.showLabel
  }

  /**
   * The track's `aria-labelledby`: the `labelledBy` input when given, else the
   * rendered label's id, else `null` (React omits the attribute).
   * @returns The labelled-by id, or `null`.
   */
  get trackLabelledBy(): string | null {
    return this.labelledBy ?? (this.nameByLabel ? this.labelId : null)
  }

  /**
   * The track's `aria-label`: the `t('progressBar.label')` default when no
   * `labelledBy` input and no rendered label names it, else `null` (React
   * omits the attribute).
   * @returns The fallback name, or `null`.
   */
  get trackAriaLabel(): string | null {
    return this.labelledBy === undefined && !this.showLabel
      ? this.i18n.t('progressBar.label', undefined, { defaultValue: 'Progress' })
      : null
  }

  /**
   * The maximum width (React's default parameter: a later-bound write of
   * `undefined` must not erase the `100` default).
   * @returns The maximum.
   */
  maxValue(): number {
    return this.max ?? 100
  }

  /**
   * The size preset (React's `size = 'md'`).
   * @returns The size.
   */
  sizeValue(): 'sm' | 'md' | 'lg' {
    return this.size ?? 'md'
  }

  /**
   * The color variant (React's `color = 'primary'`).
   * @returns The color.
   */
  colorValue(): 'primary' | 'success' | 'warning' | 'error' | 'info' {
    return this.color ?? 'primary'
  }

  /**
   * The fill percentage React computes (`max === 0` renders empty).
   * @returns The percentage in the 0–100 range.
   */
  fillPercent(): number {
    const max = this.maxValue()
    return max === 0 ? 0 : Math.max(0, Math.min(100, (this.value / max) * 100))
  }

  /**
   * The fill's inline style (React's `{ width: '<pct>%' }`).
   * @returns The style attribute text.
   */
  fillStyleText(): string | null {
    return styleText({ width: `${this.fillPercent()}%` })
  }

  /**
   * The host's class list (React's `cm.cn(cm.stack(2), className)`).
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    return cm.cn(cm.stack(2), this.className)
  }

  /**
   * The header row's class list (React's `cm.flex({ justify: 'between', align: 'center' })`).
   * @returns The class string.
   */
  headerClasses(): string {
    return this.cm().flex({ justify: 'between', align: 'center' })
  }

  /**
   * The label span's class list (React's `cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))`).
   * @returns The class string.
   */
  labelClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))
  }

  /**
   * The value-label span's class list (React's `cm.textSize('sm')`).
   * @returns The class string.
   */
  valueLabelClasses(): string {
    return this.cm().textSize('sm')
  }

  /**
   * The track's class list (React's `cm.cn(cm.progress(), cm.progressHeight(size))`).
   * @returns The class string.
   */
  trackClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.progress(), cm.progressHeight(this.sizeValue()))
  }

  /**
   * The fill's class list (React's `cm.cn(cm.progressBar(), cm.progressColor(color))`).
   * @returns The class string.
   */
  fillClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.progressBar(), cm.progressColor(this.colorValue()))
  }
}
