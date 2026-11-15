/**
 * ProgressCard component (React parity).
 *
 * @module
 */

import type { AfterViewInit, ElementRef } from '@angular/core'
import { Component, signal, ViewChild } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { ProgressBar } from './progress-bar.component.js'
import type { ProgressCardProps } from './types.js'

/**
 * Whether a node is something a caller can see (an element, or a non-blank
 * text node).
 *
 * @param node - The DOM node.
 * @returns True when it renders anything.
 */
const hasRenderable = (node: Node): boolean =>
  node.nodeType === Node.ELEMENT_NODE ||
  (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim().length > 0)

/**
 * Whether a projected region landed: the region's own children after the
 * text the component interpolated itself (React would not render the region
 * at all without one).
 *
 * @param el - The element.
 * @param ownText - Whether the element's first child is the component's own interpolated text.
 * @returns True when the caller projected content into it.
 */
const hasProjection = (el: HTMLElement, ownText: boolean): boolean =>
  Array.from(el.childNodes)
    .slice(ownText ? 1 : 0)
    .some(hasRenderable)

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
 * This is the Angular counterpart of `@molecule/app-progress-bar-react`: the
 * same props (React names), the same ClassMap tokens, and the same DOM for the
 * same input.
 *
 * @remarks
 * Angular projection needs the `<ng-content>` capture points mounted, so the
 * optional description and value-label regions render optimistically and
 * {@link ProgressCard.ngAfterViewInit} withdraws the ones nothing was
 * projected into (React would not render them at all).
 */
@Component({
  selector: 'div[mol-progress-card]',
  standalone: true,
  imports: [ProgressBar],
  inputs: ['title', 'description', 'icon', 'value', 'max', 'valueLabel', 'color', 'className'],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `<div [class]="stackClasses()"><div [class]="headerClasses()"><div [class]="leftClasses()">@if (hasIcon) {{{ icon }}}<ng-content select="[slot=icon]"></ng-content><div><h3 [class]="titleClasses()">@if (hasTitle) {{{ title }}}<ng-content select="[slot=title]"></ng-content></h3>@if (showDescription) {<p #descriptionEl [class]="descriptionClasses()">@if (hasDescription) {{{ description }}}<ng-content select="[slot=description]"></ng-content></p>}</div></div>@if (showValueLabel) {<span #valueLabelEl [class]="valueLabelClasses()">@if (hasValueLabel) {{{ valueLabel }}}<ng-content select="[slot=valueLabel]"></ng-content></span>}</div><div mol-progress-bar [value]="value" [max]="maxValue()" [color]="colorValue()"></div><ng-content></ng-content></div>`,
})
export class ProgressCard implements AfterViewInit {
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

  /** The optional description paragraph (projected content lands here; read once). */
  @ViewChild('descriptionEl') private descriptionEl?: ElementRef<HTMLParagraphElement>
  /** The optional value-label span (projected content lands here; read once). */
  @ViewChild('valueLabelEl') private valueLabelEl?: ElementRef<HTMLSpanElement>

  /** Whether a `[slot=description]` projection landed (true until the first view proves otherwise). */
  private readonly descriptionProjected = signal(true)
  /** Whether a `[slot=valueLabel]` projection landed (true until the first view proves otherwise). */
  private readonly valueLabelProjected = signal(true)

  /**
   * Reads the optional regions' first render: when neither a text input nor
   * projected content landed, React would not render the region at all, so the
   * optimistic render is withdrawn.
   */
  ngAfterViewInit(): void {
    const description = this.descriptionEl?.nativeElement
    if (description) this.descriptionProjected.set(hasProjection(description, this.hasDescription))
    const valueLabel = this.valueLabelEl?.nativeElement
    if (valueLabel) this.valueLabelProjected.set(hasProjection(valueLabel, this.hasValueLabel))
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
    return this.hasDescription || this.descriptionProjected()
  }

  /**
   * Whether the value-label span renders.
   * @returns True when the value label shows.
   */
  get showValueLabel(): boolean {
    return this.hasValueLabel || this.valueLabelProjected()
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
