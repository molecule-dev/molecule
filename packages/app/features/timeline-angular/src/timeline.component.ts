/**
 * Timeline component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, ElementRef, inject, TemplateRef, ViewChild } from '@angular/core'

import {
  MolPlacement,
  placeContent,
  placeContentBefore,
  setElementPresent,
  type SlotReader,
  usePlacement,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

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
 * that empty state alone (a fragment). Everything the host holds (the empty
 * state's capture and the wrapper `<div>`) renders in the host's place and the
 * host itself leaves the page, so the fragment root is React's exact DOM. The
 * empty state is projected content
 * (`[slot=emptyState]`) or a template reference passed as an input, reconciled
 * against React's branch by the placement function registered in the
 * constructor. Rows are
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
  hostDirectives: [MolPlacement],
  imports: [NgTemplateOutlet, TimelineEvent],
  inputs: ['events', 'renderDateSeparator', 'emptyState', 'className'],
  // prettier-ignore
  template: `<span #empty>@if (emptyText(); as text) {{{ text }}}@if (emptyTemplate(); as empty) {<ng-container [ngTemplateOutlet]="empty"></ng-container>}<ng-content select="[slot=emptyState]"></ng-content></span><div #list [class]="classes()">@for (event of events; track event.id; let i = $index) {<div>@if (separatorTemplate(); as separator) {<ng-container [ngTemplateOutlet]="separator" [ngTemplateOutletContext]="separatorContext(event, i)"></ng-container>}<div mol-timeline-event [event]="event" [isLast]="i === events.length - 1"></div></div>}</div>`,
})
export class Timeline {
  /** Events in display order. */
  events: TimelineEventData[] = []
  /** Optional renderer for date separators: a template reference with the event in its context. */
  renderDateSeparator?: TemplateRef<unknown>
  /** Rendered when there are no events: a template reference, plain text, or `[slot=emptyState]`. */
  emptyState?: unknown
  /** Extra classes on the outer wrapper. */
  className?: string

  /** The projected empty-state capture point (its content renders in its place, and it leaves the page). */
  @ViewChild('empty') private empty?: ElementRef<HTMLElement>

  /** The wrapper `<div>` (detached when the empty state renders instead). */
  @ViewChild('list') private list?: ElementRef<HTMLElement>

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  constructor() {
    // React's root is the wrapper `<div>`, or the empty state alone (a fragment): the
    // host's content renders in the host's place and the host itself leaves the page.
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
   * Applies React's condition: with no events and an empty state, the empty
   * state renders bare and the wrapper disappears; otherwise the wrapper
   * renders and the empty state is dropped.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private reconcile(hasContent: SlotReader): void {
    const host = this.host.nativeElement
    const empty = this.empty?.nativeElement
    const list = this.list?.nativeElement
    const hasEmpty = (this.events?.length ?? 0) === 0 && hasContent(empty)
    if (hasEmpty) {
      // The capture's content renders exactly where the capture stood, and the capture
      // itself leaves the page.
      placeContentBefore(empty, empty)
    } else {
      // Back inside the capture, so it leaves the page with it.
      placeContent(empty, null)
    }
    setElementPresent(empty, false)
    setElementPresent(list, !hasEmpty)
    // React's root is the fragment: everything renders in the host's place, and the host
    // itself leaves the page.
    placeContentBefore(host, host)
    setElementPresent(host, false)
  }
}
