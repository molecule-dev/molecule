/**
 * Timeline component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  type AfterViewChecked,
  type AfterViewInit,
  Component,
  type DoCheck,
  ElementRef,
  inject,
  Renderer2,
  TemplateRef,
  ViewChild,
} from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { hasNodes, SlotGuard } from './slot-dom.js'
import { TimelineEvent } from './timeline-event.component.js'
import type { TimelineEventData } from './types.js'

/**
 * Timeline component.
 *
 * Vertical chronological list of events, each rendered with a marker +
 * connector on the left (`<div mol-timeline-event>`). Optional date separators
 * come from `renderDateSeparator`, a template reference whose context carries
 * the event as `$implicit` / `a0` and its predecessor as `a1`.
 *
 * React's root is the wrapper `<div>` — or, with no events and an empty state,
 * that empty state alone (a fragment). A host element always exists in Angular,
 * so this component's host is transparent (`mol-timeline`, `display: contents`,
 * unwrapped by the conformance normalizer) and the template renders whichever
 * root React would. The empty state is projected content
 * (`[slot=emptyState]`) or a template reference passed as an input, reconciled
 * against React's branch by {@link Timeline.ngAfterViewInit} /
 * {@link Timeline.ngAfterViewChecked} / {@link Timeline.ngDoCheck}. Rows are
 * tracked by the event's `id` value (`@for (…; track event.id)`), like React's
 * per-item keys.
 *
 * This is the Angular counterpart of `@molecule/app-timeline-react`'s
 * `Timeline`: the same props (React names), the same ClassMap tokens, and the
 * same DOM for the same input.
 */
@Component({
  selector: 'mol-timeline',
  standalone: true,
  imports: [NgTemplateOutlet, TimelineEvent],
  inputs: ['events', 'renderDateSeparator', 'emptyState', 'className'],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
  // prettier-ignore
  template: `<span #empty data-parity-unwrap style="display: contents">@if (emptyText(); as text) {{{ text }}}@if (emptyTemplate(); as empty) {<ng-container [ngTemplateOutlet]="empty"></ng-container>}<ng-content select="[slot=emptyState]"></ng-content></span><div #list [class]="classes()">@for (event of events; track event.id; let i = $index) {<div>@if (separatorTemplate(); as separator) {<ng-container [ngTemplateOutlet]="separator" [ngTemplateOutletContext]="separatorContext(event, i)"></ng-container>}<div mol-timeline-event [event]="event" [isLast]="i === events.length - 1"></div></div>}</div>`,
})
export class Timeline implements AfterViewInit, AfterViewChecked, DoCheck {
  /** Events in display order. */
  events: TimelineEventData[] = []
  /** Optional renderer for date separators: a template reference with the event in its context. */
  renderDateSeparator?: TemplateRef<unknown>
  /** Rendered when there are no events: a template reference, plain text, or `[slot=emptyState]`. */
  emptyState?: unknown
  /** Extra classes on the outer wrapper. */
  className?: string

  /** The projected empty-state capture point (unwrapped, so React's bare slot). */
  @ViewChild('empty') private empty?: ElementRef<HTMLElement>

  /** The wrapper `<div>` (detached when the empty state renders instead). */
  @ViewChild('list') private list?: ElementRef<HTMLElement>

  private readonly guard = new SlotGuard(inject(ElementRef), inject(Renderer2))

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the outer wrapper's class list (`cm.stack(0)` + `className`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().stack(0), this.className)
  }

  /**
   * React's branch: with no events, the empty state renders bare (its
   * template when it is a node).
   * @returns The empty-state template, or null.
   */
  emptyTemplate(): TemplateRef<unknown> | null {
    if (this.events.length !== 0 || !this.emptyState) return null
    return this.emptyState instanceof TemplateRef ? this.emptyState : null
  }

  /**
   * React's branch: with no events, a text empty state renders bare.
   * @returns The empty-state text, or null when the wrapper renders instead.
   */
  emptyText(): string | null {
    if (this.events.length !== 0 || !this.emptyState) return null
    if (this.emptyState instanceof TemplateRef) return null
    return String(this.emptyState)
  }

  /**
   * The date-separator template, when the caller supplied one.
   * @returns The template, or null.
   */
  separatorTemplate(): TemplateRef<unknown> | null {
    return this.renderDateSeparator instanceof TemplateRef ? this.renderDateSeparator : null
  }

  /**
   * The separator template's context: React's `renderDateSeparator(event, prev)`
   * arguments as `$implicit` / `a0` (the event) and `a1` (its predecessor).
   * @param event - The event the separator precedes.
   * @param index - The event's index in the list.
   * @returns The template context.
   */
  separatorContext(event: TimelineEventData, index: number): Record<string, unknown> {
    const prev = index > 0 ? this.events[index - 1] : undefined
    return { $implicit: event, a0: event, a1: prev, a2: undefined }
  }

  /**
   * Reconciles the projected empty state and the wrapper against React's
   * branch once the view queries resolve.
   */
  ngAfterViewInit(): void {
    this.reconcile()
  }

  /**
   * Re-reconciles on later passes, so a props step that empties or refills the
   * list swaps the branch the way React does.
   */
  ngDoCheck(): void {
    this.reconcile()
  }

  /**
   * Re-reconciles after each view update: a node-valued empty state that arrives
   * through an input renders into its outlet only during the update, so the
   * branch decision must be read afterwards.
   */
  ngAfterViewChecked(): void {
    this.reconcile()
  }

  /**
   * Applies React's condition: with no events and an empty state, the empty
   * state renders bare and the wrapper disappears; otherwise the wrapper
   * renders and the empty state is dropped.
   */
  private reconcile(): void {
    const empty = this.empty?.nativeElement
    const list = this.list?.nativeElement
    const hasEmpty = (this.events?.length ?? 0) === 0 && hasNodes(empty)
    this.guard.toggle(empty, hasEmpty)
    this.guard.toggle(list, !hasEmpty)
  }
}
