/**
 * ProgressCard component (React parity).
 *
 * @module
 */

import type { ElementRef } from '@angular/core'
import { Component, signal, ViewChild } from '@angular/core'

import { MolPlacement, setElementPresent, usePlacement } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { ProgressBar } from './progress-bar.component.js'
import type { ProgressCardProps } from './types.js'

/**
 * ProgressCard component.
 *
 * `<Card>`-wrapped progress display with title, optional icon and description,
 * the progress bar itself, and an optional extras slot below. The host IS the
 * Card `div` (`div[mol-progress-card]`), matching React's root exactly — same
 * classes. Node props (`title`, `description`, `icon`, `valueLabel`,
 * `children`) are projected content (`[slot=<name>]`, or the default
 * projection) or plain string inputs.
 *
 * The bar is named by the title (`aria-labelledby`) and, when a description
 * renders, described by it (`aria-describedby`).
 *
 * This is the Angular counterpart of `@molecule/app-progress-bar-react`: the
 * same props (React names), the same ClassMap tokens, and the same DOM for the
 * same input.
 *
 * @remarks
 * Angular projection needs the `<ng-content>` capture points mounted, so the
 * optional description and value-label regions stay in the template and leave
 * the page while they have nothing to render; the placement function re-decides
 * them whenever a slot changes (React would not render them at all).
 */
@Component({
  selector: 'div[mol-progress-card]',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [ProgressBar],
  inputs: ['title', 'description', 'icon', 'value', 'max', 'valueLabel', 'color', 'className'],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `<div [class]="stackClasses()"><div [class]="headerClasses()"><div [class]="leftClasses()">@if (hasIcon) {{{ icon }}}<ng-content select="[slot=icon]"></ng-content><div><h3 [attr.id]="titleId" [class]="titleClasses()">@if (hasTitle) {{{ title }}}<ng-content select="[slot=title]"></ng-content></h3><p #descriptionEl [attr.id]="descriptionId" [class]="descriptionClasses()">@if (hasDescription) {{{ description }}}<ng-content select="[slot=description]"></ng-content></p></div></div><span #valueLabelEl [class]="valueLabelClasses()">@if (hasValueLabel) {{{ valueLabel }}}<ng-content select="[slot=valueLabel]"></ng-content></span></div><div mol-progress-bar [value]="value" [max]="maxValue()" [color]="colorValue()" [labelledBy]="titleId" [describedBy]="describedById ?? undefined"></div><ng-content></ng-content></div>`,
})
export class ProgressCard {
  /** Card title — a string input, or `[slot=title]` projected content. */
  title?: ProgressCardProps['title']
  /** Optional supporting description below the title — a string input, or `[slot=description]` content. */
  description?: ProgressCardProps['description']
  /** Optional icon shown in the card header — `[slot=icon]` projected content (or a string input). */
  icon?: ProgressCardProps['icon']
  /** Current value. */
  value!: number
  /** Maximum (defaults to `100` at read time). */
  max?: number
  /** Value display on the right of the header — a string input, or `[slot=valueLabel]` content. */
  valueLabel?: ProgressCardProps['valueLabel']
  /** ProgressBar color (defaults to `'primary'`). */
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info'
  /** Extra classes on the Card wrapper. */
  className?: string

  /** Per-instance counter backing the title/description ids (React numbers `useId()` ids). */
  private static nextId = 0
  /** The id the bar's `aria-labelledby` points at (on the title heading). */
  readonly titleId = `mol-progress-card-title-${ProgressCard.nextId++}`
  /** The id the bar's `aria-describedby` points at (on the description paragraph). */
  readonly descriptionId = `mol-progress-card-description-${ProgressCard.nextId++}`

  /** The optional description paragraph (its projected nodes decide whether it shows). */
  @ViewChild('descriptionEl', { static: true })
  private descriptionEl?: ElementRef<HTMLParagraphElement>
  /** The optional value-label span (its projected nodes decide whether it shows). */
  @ViewChild('valueLabelEl', { static: true }) private valueLabelEl?: ElementRef<HTMLSpanElement>

  /** Whether a `[slot=description]` projection landed (placement decides). */
  private readonly descriptionShown = signal(false)
  /** Whether a `[slot=valueLabel]` projection landed (placement decides). */
  private readonly valueLabelShown = signal(false)

  /**
   * Keeps the optional description and value-label regions on the page only
   * while they render a text input or projected content, re-decided whenever
   * either changes (a slot taken away and given back included).
   */
  constructor() {
    usePlacement((hasContent) => {
      const description = this.descriptionEl?.nativeElement
      const valueLabel = this.valueLabelEl?.nativeElement
      const showDescription = this.hasDescription || (description ? hasContent(description) : false)
      const showValueLabel = this.hasValueLabel || (valueLabel ? hasContent(valueLabel) : false)
      this.descriptionShown.set(showDescription)
      this.valueLabelShown.set(showValueLabel)
      setElementPresent(description, showDescription)
      setElementPresent(valueLabel, showValueLabel)
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
   * Whether a text icon input renders (a projected icon is not).
   * @returns True when the icon renders as text.
   */
  get hasIcon(): boolean {
    return this.icon !== undefined && this.icon !== null && this.icon !== false && this.icon !== ''
  }

  /**
   * Whether a text title input renders (a projected title is not).
   * @returns True when the title renders as text.
   */
  get hasTitle(): boolean {
    return this.title !== undefined && this.title !== null
  }

  /**
   * Whether a text description input is present (React's `description && …`).
   * @returns True when the description renders as text.
   */
  get hasDescription(): boolean {
    return (
      this.description !== undefined &&
      this.description !== null &&
      this.description !== false &&
      this.description !== ''
    )
  }

  /**
   * Whether a text value-label input is present (React's `valueLabel && …`).
   * @returns True when the value label renders as text.
   */
  get hasValueLabel(): boolean {
    return (
      this.valueLabel !== undefined &&
      this.valueLabel !== null &&
      this.valueLabel !== false &&
      this.valueLabel !== ''
    )
  }

  /**
   * Whether the description paragraph renders.
   * @returns True when the description shows.
   */
  get showDescription(): boolean {
    return this.hasDescription || this.descriptionShown()
  }

  /**
   * Whether the value-label span renders.
   * @returns True when the value label shows.
   */
  get showValueLabel(): boolean {
    return this.hasValueLabel || this.valueLabelShown()
  }

  /**
   * The bar's `aria-describedby`: the description paragraph's id while the
   * paragraph renders (React passes it only when a description is present).
   * @returns The described-by id, or `null` (React omits the attribute).
   */
  get describedById(): string | null {
    return this.showDescription ? this.descriptionId : null
  }

  /**
   * The maximum (React's default parameter: a later-bound write of `undefined`
   * must not erase the `100` default).
   * @returns The maximum.
   */
  maxValue(): number {
    return this.max ?? 100
  }

  /**
   * The color variant (React's `color = 'primary'`).
   * @returns The color.
   */
  colorValue(): 'primary' | 'success' | 'warning' | 'error' | 'info' {
    return this.color ?? 'primary'
  }

  /**
   * The host's class list (React's `<Card className>` classes).
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    return cm.cn(cm.card({ variant: 'elevated' }), cm.cardPadding('md'), this.className)
  }

  /**
   * The stack wrapper's class list (React's `cm.stack(3)`).
   * @returns The class string.
   */
  stackClasses(): string {
    return this.cm().stack(3)
  }

  /**
   * The header row's class list (React's `cm.flex({ justify: 'between', align: 'start', gap: 'sm' })`).
   * @returns The class string.
   */
  headerClasses(): string {
    return this.cm().flex({ justify: 'between', align: 'start', gap: 'sm' })
  }

  /**
   * The left group's class list (React's `cm.flex({ align: 'center', gap: 'sm' })`).
   * @returns The class string.
   */
  leftClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'sm' })
  }

  /**
   * The title heading's class list (React's `cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))`).
   * @returns The class string.
   */
  titleClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))
  }

  /**
   * The description paragraph's class list (React's `cm.textSize('sm')`).
   * @returns The class string.
   */
  descriptionClasses(): string {
    return this.cm().textSize('sm')
  }

  /**
   * The value-label span's class list (React's `cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))`).
   * @returns The class string.
   */
  valueLabelClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))
  }
}
