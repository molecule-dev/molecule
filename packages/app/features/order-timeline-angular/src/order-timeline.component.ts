/**
 * OrderTimeline component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, type ElementRef, signal, TemplateRef, ViewChild } from '@angular/core'

import { MolPlacement, setElementPresent, usePlacement } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { OrderMilestone } from './types.js'

/**
 * The status node's class: current wins over completed (its semantic tone),
 * and every other milestone is de-emphasis chrome — the theme's border colour
 * rather than a status tone.
 *
 * @param cm - The class map.
 * @param milestone - The milestone.
 * @returns The node's class.
 */
const dotClass = (cm: UIClassMap, milestone: OrderMilestone): string =>
  cm.cn(
    milestone.current
      ? cm.bgTone('info')
      : milestone.completed
        ? cm.bgTone('success')
        : cm.bgBorder,
  )

/**
 * The connector line's class: a completed leg takes the success tone; an
 * un-reached one is de-emphasis chrome in the theme's border colour.
 *
 * @param cm - The class map.
 * @param milestone - The milestone the connector belongs to.
 * @returns The connector's class.
 */
const connectorClass = (cm: UIClassMap, milestone: OrderMilestone): string =>
  milestone.completed ? cm.bgTone('success') : cm.bgBorder

/**
 * OrderTimeline component.
 *
 * Order / shipment progress timeline — typical e-commerce flow:
 * "Placed → Confirmed → Shipped → Out for delivery → Delivered". The host IS
 * the outer `<div>` (`div[mol-order-timeline]`), matching React's root exactly,
 * and the rows are tracked by the milestone's `id` value
 * (`@for (…; track milestone.id)`), like React's per-item keys. A node-valued
 * `eta` is projected (`[slot=eta]`); a string input renders as text.
 *
 * Different from `<Stepper>` in two ways:
 * - Focuses on milestones (with optional per-step detail) rather than
 *   multi-page wizard steps.
 * - Horizontal layout is responsive with connector lines between nodes.
 */
@Component({
  selector: 'div[mol-order-timeline]',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [NgTemplateOutlet],
  inputs: ['milestones', 'eta', 'orientation', 'className'],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `<div [class]="listClasses()">@for (milestone of milestones; track milestone.id; let i = $index) {<div [class]="rowClasses()"><div [class]="cm().flex({ align: 'center', justify: 'center' })"><span aria-hidden="true" [class]="nodeClass(milestone)" [style]="dotStyle(milestone)"></span>@if (i < milestones.length - 1) {<span aria-hidden="true" [class]="lineClass(milestone)" [style]="connectorStyle()"></span>}</div><div [class]="cm().cn(cm().stack(0))"><span [class]="labelClasses(milestone)">@if (isText(milestone.label)) {<ng-container>{{ milestone.label }}</ng-container>}@else {<ng-container [ngTemplateOutlet]="templateOf(milestone.label)"></ng-container>}</span>@if (milestone.detail) {<span [class]="cm().textSize('xs')">@if (isText(milestone.detail)) {<ng-container>{{ milestone.detail }}</ng-container>}@else {<ng-container [ngTemplateOutlet]="templateOf(milestone.detail)"></ng-container>}</span>}</div></div>}</div><div #etaEl [class]="cm().cn(cm().textSize('sm'), cm().fontWeight('semibold'))">@if (hasTextEta()) {<ng-container>{{ eta }}</ng-container>}<ng-content select="[slot=eta]"></ng-content></div>`,
})
export class OrderTimeline {
  /** The milestones, rendered in order from earliest to latest. */
  milestones: OrderMilestone[] = []
  /** Optional ETA / summary line: text, or projected `[slot=eta]` content. */
  eta?: unknown
  /** Layout orientation (defaults to `'horizontal'` at read time). */
  orientation?: 'horizontal' | 'vertical'
  /** Extra classes on the outer wrapper. */
  className?: string

  /** The rendered ETA `<div>` (its projected nodes decide whether it shows). */
  @ViewChild('etaEl', { static: true }) private etaEl?: ElementRef<HTMLDivElement>

  /** Whether the ETA line's projected content renders (placement decides). */
  private readonly etaShown = signal(false)

  /**
   * Keeps the ETA `<div>` on the page only while it renders a text input or
   * projected `[slot=eta]` content, re-decided whenever either changes.
   */
  constructor() {
    usePlacement((hasContent) => {
      const etaEl = this.etaEl?.nativeElement
      const showEta = this.hasTextEta() || (etaEl ? hasContent(etaEl) : false)
      this.etaShown.set(showEta)
      setElementPresent(etaEl, showEta)
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
   * Whether the layout is vertical (React's `'horizontal'` default).
   * @returns True for the vertical layout.
   */
  vertical(): boolean {
    return this.orientation === 'vertical'
  }

  /**
   * Computes the outer wrapper class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().stack(3), this.className)
  }

  /**
   * Computes the milestone rail's class list.
   * @returns The class string.
   */
  listClasses(): string {
    return this.vertical() ? this.cm().stack(2) : this.cm().flex({ align: 'start', gap: 'sm' })
  }

  /**
   * Computes one milestone row's class list.
   * @returns The class string.
   */
  rowClasses(): string {
    return this.vertical()
      ? this.cm().flex({ align: 'start', gap: 'sm' })
      : this.cm().cn(this.cm().stack(1), this.cm().flex1, this.cm().textCenter)
  }

  /**
   * Computes one milestone label's class list (React's weight switch).
   * @param milestone - The milestone.
   * @returns The class string.
   */
  labelClasses(milestone: OrderMilestone): string {
    return this.cm().cn(
      this.cm().textSize('sm'),
      milestone.current ? this.cm().fontWeight('bold') : this.cm().fontWeight('medium'),
    )
  }

  /**
   * The status node's class (see {@link dotClass}): current wins over
   * completed, every other milestone is de-emphasis chrome.
   * @param milestone - The milestone.
   * @returns The node's class.
   */
  nodeClass(milestone: OrderMilestone): string {
    return dotClass(this.cm(), milestone)
  }

  /**
   * The connector line's class (see {@link connectorClass}): a completed leg
   * takes the success tone, an un-reached one the theme's border colour.
   * @param milestone - The milestone the connector belongs to.
   * @returns The connector's class.
   */
  lineClass(milestone: OrderMilestone): string {
    return connectorClass(this.cm(), milestone)
  }

  /**
   * The status node's inline style, exactly React's declarations: sizing only
   * — the fill colour is a ClassMap class (`nodeClass`). A property React
   * omits is passed as `''`, which clears it.
   * @param milestone - The milestone.
   * @returns The style map.
   */
  dotStyle(milestone: OrderMilestone): Record<string, string> {
    return {
      width: '14px',
      height: '14px',
      'border-radius': '50%',
      border: milestone.current ? '3px solid currentColor' : '',
    }
  }

  /**
   * The connector line's inline style, exactly React's declarations:
   * horizontal lines stretch between nodes, vertical ones run below the node
   * — sizing and flow only, the fill colour is a ClassMap class
   * (`lineClass`).
   * @returns The style map.
   */
  connectorStyle(): Record<string, string> {
    return this.vertical()
      ? {
          height: '24px',
          width: '2px',
          display: 'inline-block',
          flex: '',
          'margin-left': '',
          'margin-right': '',
        }
      : {
          width: '100%',
          height: '2px',
          display: 'inline-block',
          flex: '1',
          'margin-left': '4px',
          'margin-right': '4px',
        }
  }

  /**
   * Whether a value is plain text (React renders it as text, not as nodes).
   * @param value - A label, detail or eta.
   * @returns True when the value is a string.
   */
  isText(value: unknown): value is string {
    return typeof value === 'string'
  }

  /**
   * Narrows a value to an embedded template.
   * @param value - A label, detail or eta.
   * @returns The template, or null.
   */
  templateOf(value: unknown): TemplateRef<unknown> | null {
    return value instanceof TemplateRef ? value : null
  }

  /**
   * Whether the ETA is a non-empty text input.
   * @returns True when the eta input renders as text.
   */
  hasTextEta(): boolean {
    return typeof this.eta === 'string' && this.eta !== ''
  }

  /**
   * Whether the ETA `<div>` renders: React's `eta &&` on the text input or a
   * projected `[slot=eta]`, re-decided as the slot changes.
   * @returns True when the ETA line shows.
   */
  showEta(): boolean {
    return this.hasTextEta() || this.etaShown()
  }
}
