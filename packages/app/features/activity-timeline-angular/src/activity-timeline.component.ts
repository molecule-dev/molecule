/**
 * ActivityTimeline component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, TemplateRef } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { ActivityTimelineRow } from './activity-timeline-row.component.js'
import type { TimelineEventData, TimelineKindTone } from './types.js'

/** The tone an event gets when neither the map nor the default lists its kind. */
const FALLBACK_TONE: TimelineKindTone = {
  icon: 'event',
}

/**
 * ActivityTimeline component.
 *
 * Vertical timeline with connector rail and per-kind dot markers. The host IS
 * the panel `<div>` (`div[mol-activity-timeline]`), matching React's root
 * exactly: `header` content, the rail + rows stack, then `footer` content.
 *
 * Node props are projected content (`[slot=header]` / `[slot=footer]`) or
 * template-reference inputs, as an input cannot carry a node; a plain string or
 * number renders as text. `rowWrapper` is a template reference called with each
 * event (`a0`) and the row's own content (`a1`), as React's render prop is.
 */
@Component({
  selector: 'div[mol-activity-timeline]',
  standalone: true,
  imports: [NgTemplateOutlet, ActivityTimelineRow],
  inputs: ['events', 'toneByKind', 'defaultTone', 'rowWrapper', 'header', 'footer', 'className'],
  host: {
    '[class]': 'classes()',
  },
  // The template's whitespace is semantic (Angular keeps whitespace-only text
  // nodes between elements), so every block is glued and no literal text
  // separates them.
  // prettier-ignore
  template: `@if (isNode(header)) {<ng-container [ngTemplateOutlet]="templateOf(header)"></ng-container>}@else if (header != null) {{{ textOf(header) }}}<ng-content select="[slot=header]"></ng-content><div [class]="stackClasses()"><span aria-hidden="true" [class]="railClasses()" style="position: absolute; left: 0.75rem; top: 0.5rem; bottom: 0.5rem; width: 1px"></span>@for (event of events; track event.id) {<div mol-activity-timeline-row [event]="event" [tone]="toneOf(event)" [wrapper]="rowWrapper"></div>}</div>@if (isNode(footer)) {<ng-container [ngTemplateOutlet]="templateOf(footer)"></ng-container>}@else if (footer != null) {{{ textOf(footer) }}}<ng-content select="[slot=footer]"></ng-content>`,
})
export class ActivityTimeline {
  /** The events to stack, in display order. */
  events: TimelineEventData[] = []
  /** Visual treatment per event kind. Falls back to a generic dot for unknown kinds. */
  toneByKind?: Record<string, TimelineKindTone>
  /** Default tone applied when `toneByKind` doesn't list the event's kind. */
  defaultTone?: TimelineKindTone
  /**
   * Wrap each row (e.g. with a router link), as a template reference whose
   * context carries the event as `$implicit`/`a0` and the row's content as `a1`.
   */
  rowWrapper?: TemplateRef<unknown>
  /** Slot rendered above the timeline (heading, filters, etc.). */
  header?: unknown
  /** Slot rendered below the timeline (load-more link, footer chips, etc.). */
  footer?: unknown
  /** Extra classes on the panel. */
  className?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the panel's class list.
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    return cm.cn(cm.card(), cm.sp('p', 6), this.className)
  }

  /**
   * Computes the rows stack's class list.
   * @returns The class string.
   */
  stackClasses(): string {
    return this.cm().cn(this.cm().stack(8), this.cm().position('relative'))
  }

  /**
   * Computes the connector rail's class list.
   * @returns The class string.
   */
  railClasses(): string {
    return this.cm().cn(this.cm().bgBorder)
  }

  /**
   * The tone a row renders: its kind's entry, else the case default, else the
   * generic dot.
   * @param event - The row's event.
   * @returns Its tone.
   */
  toneOf(event: TimelineEventData): TimelineKindTone {
    return this.toneByKind?.[event.kind] ?? this.defaultTone ?? FALLBACK_TONE
  }

  /**
   * Whether a prop holds a node (an `ng-template` reference) rather than text.
   * @param value - The prop.
   * @returns True when it renders through a template outlet.
   */
  isNode(value: unknown): value is TemplateRef<unknown> {
    return value instanceof TemplateRef
  }

  /**
   * Narrows a value to an embedded template.
   * @param value - A node-valued prop.
   * @returns The template, or null.
   */
  templateOf(value: unknown): TemplateRef<unknown> | null {
    return value instanceof TemplateRef ? value : null
  }

  /**
   * The text a prop renders (React renders strings and numbers as text).
   * @param value - The prop.
   * @returns The text, or `''` for a node value.
   */
  textOf(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  }
}
