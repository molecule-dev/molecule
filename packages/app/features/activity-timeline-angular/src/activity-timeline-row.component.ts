/**
 * ActivityTimelineRow component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, TemplateRef } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { ActivityTimelineDot } from './activity-timeline-dot.component.js'
import type { TimelineEventData, TimelineKindTone } from './types.js'

/** The row's default tone when the caller passes none. */
const DEFAULT_TONE: TimelineKindTone = { icon: 'event' }

/**
 * ActivityTimelineRow component.
 *
 * A single row of `<div mol-activity-timeline>`: header / description / meta /
 * footer + a dot on the left, with the connector line drawn by the parent
 * container. The host IS the row's `<div>` (`div[mol-activity-timeline-row]`),
 * matching React's root exactly. Node-valued event fields are `ng-template`
 * references rendered through {@link NgTemplateOutlet}; string / number fields
 * render as text. `wrapper` is a template reference called with the row's own
 * content (`a1`) and the event (`a0`), as React's `wrapper(children)` render
 * prop is; its result replaces the row's content.
 */
@Component({
  selector: 'div[mol-activity-timeline-row]',
  standalone: true,
  imports: [NgTemplateOutlet, ActivityTimelineDot],
  inputs: ['event', 'tone', 'wrapper'],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `<ng-template #innerTpl><div mol-activity-timeline-dot [tone]="activeTone()"></div><div><div [class]="titleRowClasses()"><h3 [class]="titleClasses()">@if (isNode(event.title)) {<ng-container [ngTemplateOutlet]="templateOf(event.title)"></ng-container>}@else {{{ textOf(event.title) }}}</h3>@if (event.meta) {<span [class]="metaClasses()" style="white-space: nowrap">@if (isNode(event.meta)) {<ng-container [ngTemplateOutlet]="templateOf(event.meta)"></ng-container>}@else {{{ textOf(event.meta) }}}</span>}</div>@if (event.description) {<p [class]="descriptionClasses()">@if (isNode(event.description)) {<ng-container [ngTemplateOutlet]="templateOf(event.description)"></ng-container>}@else {{{ textOf(event.description) }}}</p>}@if (event.footer != null) {@if (isNode(event.footer)) {<ng-container [ngTemplateOutlet]="templateOf(event.footer)"></ng-container>}@else {{{ textOf(event.footer) }}}}</div></ng-template>@if (wrapper) {<ng-container [ngTemplateOutlet]="wrapper" [ngTemplateOutletContext]="wrapperContext(innerTpl)"></ng-container>}@else {<ng-container [ngTemplateOutlet]="innerTpl"></ng-container>}`,
})
export class ActivityTimelineRow {
  /** The event the row shows. */
  event!: TimelineEventData
  /** Visual treatment for the event's kind. */
  tone?: TimelineKindTone
  /**
   * Render the row inside a custom wrapper (a template reference whose context
   * carries the event as `$implicit`/`a0` and the row's content as `a1`).
   */
  wrapper?: TemplateRef<unknown>

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the row's class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().sp('pl', 10), this.cm().position('relative'))
  }

  /**
   * The tone the dot renders (React's `tone ?? DEFAULT_TONE`).
   * @returns The tone.
   */
  activeTone(): TimelineKindTone {
    return this.tone ?? DEFAULT_TONE
  }

  /**
   * Computes the title row's class list.
   * @returns The class string.
   */
  titleRowClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 1))
  }

  /**
   * Computes the title heading's class list.
   * @returns The class string.
   */
  titleClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().fontWeight('bold'))
  }

  /**
   * Computes the meta label's class list.
   * @returns The class string.
   */
  metaClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.fontWeight('medium'), cm.textSize('xs'), cm.textMuted, cm.uppercase)
  }

  /**
   * Computes the description's class list.
   * @returns The class string.
   */
  descriptionClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'), this.cm().textMuted)
  }

  /**
   * The context a wrapper template renders with.
   * @param inner - The row's own content as a template.
   * @returns The template context.
   */
  wrapperContext(inner: TemplateRef<unknown>): Record<string, unknown> {
    return { $implicit: this.event, a0: this.event, a1: inner, a2: undefined }
  }

  /**
   * Whether a field holds a node (an `ng-template` reference) rather than text.
   * @param value - The row field.
   * @returns True when it renders through a template outlet.
   */
  isNode(value: unknown): value is TemplateRef<unknown> {
    return value instanceof TemplateRef
  }

  /**
   * Narrows a value to an embedded template.
   * @param value - A row field.
   * @returns The template, or null.
   */
  templateOf(value: unknown): TemplateRef<unknown> | null {
    return value instanceof TemplateRef ? value : null
  }

  /**
   * The text a field renders (React renders strings and numbers as text).
   * @param value - The row field.
   * @returns The text, or `''` for a node field.
   */
  textOf(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  }
}
