/**
 * OrderTimeline component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  type AfterViewInit,
  Component,
  type ElementRef,
  signal,
  TemplateRef,
  ViewChild,
} from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { OrderMilestone } from './types.js'

/**
 * Whether a wrapper element renders anything besides its static content: an
 * element child (a projected `[slot=eta]` landed) or non-empty text.
 *
 * @param node - The wrapper element.
 * @returns True when its children render anything.
 */
const hasRenderableContent = (node: Node): boolean =>
  Array.from(node.childNodes).some(
    (child) =>
      child.nodeType === Node.ELEMENT_NODE ||
      (child.nodeType === Node.TEXT_NODE && (child.textContent ?? '').trim().length > 0),
  )

/**
 * The status node's color: current wins over completed, and every other
 * milestone is pending.
 *
 * @param milestone - The milestone.
 * @returns The node color.
 */
const dotColor = (milestone: OrderMilestone): string =>
  milestone.current ? '#60a5fa' : milestone.completed ? '#22c55e' : '#d1d5db'

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
  imports: [NgTemplateOutlet],
  inputs: ['milestones', 'eta', 'orientation', 'className'],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `<div [class]="listClasses()">@for (milestone of milestones; track milestone.id; let i = $index) {<div [class]="rowClasses()"><div [class]="cm().flex({ align: 'center', justify: 'center' })"><span aria-hidden="true" [style]="dotStyle(milestone)"></span>@if (i < milestones.length - 1) {<span aria-hidden="true" [style]="connectorStyle(milestone)"></span>}</div><div [class]="cm().cn(cm().stack(0))"><span [class]="labelClasses(milestone)">@if (isText(milestone.label)) {<ng-container>{{ milestone.label }}</ng-container>}@else {<ng-container [ngTemplateOutlet]="templateOf(milestone.label)"></ng-container>}</span>@if (milestone.detail) {<span [class]="cm().textSize('xs')">@if (isText(milestone.detail)) {<ng-container>{{ milestone.detail }}</ng-container>}@else {<ng-container [ngTemplateOutlet]="templateOf(milestone.detail)"></ng-container>}</span>}</div></div>}</div>@if (showEta()) {<div #etaEl [class]="cm().cn(cm().textSize('sm'), cm().fontWeight('semibold'))">@if (hasTextEta()) {<ng-container>{{ eta }}</ng-container>}<ng-content select="[slot=eta]"></ng-content></div>}`,
})
export class OrderTimeline implements AfterViewInit {
  /** The milestones, rendered in order from earliest to latest. */
  milestones: OrderMilestone[] = []
  /** Optional ETA / summary line: text, or projected `[slot=eta]` content. */
  eta?: unknown
  /** Layout orientation (defaults to `'horizontal'` at read time). */
  orientation?: 'horizontal' | 'vertical'
  /** Extra classes on the outer wrapper. */
  className?: string

  /** The rendered ETA `<div>` (its content decides whether it exists at all). */
  @ViewChild('etaEl') private etaEl?: ElementRef<HTMLDivElement>

  /** Whether a `[slot=eta]` projection landed (true until the first view proves otherwise). */
  private readonly etaProjected = signal(true)

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
   * The status node's inline style, exactly React's declarations. A property
   * React omits is passed as `''`, which clears it.
   * @param milestone - The milestone.
   * @returns The style map.
   */
  dotStyle(milestone: OrderMilestone): Record<string, string> {
    return {
      width: '14px',
      height: '14px',
      'border-radius': '50%',
      background: dotColor(milestone),
      border: milestone.current ? '3px solid currentColor' : '',
    }
  }

  /**
   * The connector line's inline style, exactly React's declarations:
   * horizontal lines stretch between nodes, vertical ones run below the node.
   * @param milestone - The milestone the connector belongs to.
   * @returns The style map.
   */
  connectorStyle(milestone: OrderMilestone): Record<string, string> {
    const background = milestone.completed ? '#22c55e' : '#d1d5db'
    return this.vertical()
      ? {
          height: '24px',
          width: '2px',
          background,
          display: 'inline-block',
          flex: '',
          'margin-left': '',
          'margin-right': '',
        }
      : {
          width: '100%',
          height: '2px',
          background,
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
   * projected `[slot=eta]` (withdrawn at view init when neither is present).
   * @returns True when the ETA line shows.
   */
  showEta(): boolean {
    return this.hasTextEta() || this.etaProjected()
  }

  /**
   * Reads the rendered ETA `<div>` once: the text input renders as a text node
   * of this component's own, so an ELEMENT child is projected `[slot=eta]`
   * content. When neither is present, React would not render the element at
   * all, so the optimistic render is withdrawn.
   */
  ngAfterViewInit(): void {
    const el = this.etaEl?.nativeElement
    const projected =
      el !== undefined &&
      Array.from(el.childNodes).some((child) => child.nodeType === Node.ELEMENT_NODE) &&
      hasRenderableContent(el)
    this.etaProjected.set(projected)
  }
}
