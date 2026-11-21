/**
 * TimelineEvent component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, TemplateRef } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { TimelineRail } from './timeline-rail.component.js'
import type { TimelineEventData } from './types.js'

/**
 * TimelineEvent component.
 *
 * One row of a `<Timeline>`: [rail (marker + connector)] [timestamp / title /
 * body]. The host IS the row's outer `<div>` (`div[mol-timeline-event]`),
 * matching React's root exactly. The event's node-valued fields are
 * `ng-template` references rendered through `NgTemplateOutlet`; string / number
 * fields render as text.
 *
 * This is the Angular counterpart of `@molecule/app-timeline-react`'s
 * `TimelineEvent`: the same props (React names), the same ClassMap tokens, and
 * the same DOM for the same input.
 */
@Component({
  selector: 'div[mol-timeline-event]',
  standalone: true,
  imports: [NgTemplateOutlet, TimelineRail],
  inputs: ['event', 'isLast', 'className'],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `<div mol-timeline-rail [marker]="event.marker" [connector]="!isLast"></div><div [class]="contentClasses()"><div [class]="timestampClasses()">@if (isNode(event.timestamp)) {<ng-container [ngTemplateOutlet]="templateOf(event.timestamp)" />}@else {{{ textOf(event.timestamp) }}}</div><div [class]="titleClasses()">@if (isNode(event.title)) {<ng-container [ngTemplateOutlet]="templateOf(event.title)" />}@else {{{ textOf(event.title) }}}</div>@if (event.body) {<div [class]="cm().textSize('sm')">@if (isNode(event.body)) {<ng-container [ngTemplateOutlet]="templateOf(event.body)" />}@else {{{ textOf(event.body) }}}</div>}</div>`,
})
export class TimelineEvent {
  /** The event to render. */
  event!: TimelineEventData
  /** Whether this is the last event in the list (suppresses the connector). */
  isLast?: boolean
  /** Extra classes. */
  className?: string

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
    return this.cm().cn(this.cm().flex({ align: 'stretch', gap: 'sm' }), this.className)
  }

  /**
   * Computes the content column's class list.
   * @returns The class string.
   */
  contentClasses(): string {
    return this.cm().cn(this.cm().flex1, this.cm().stack(1), this.cm().sp('pb', 4))
  }

  /**
   * Computes the timestamp line's class list.
   * @returns The class string.
   */
  timestampClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'), this.cm().fontWeight('medium'))
  }

  /**
   * Computes the title line's class list.
   * @returns The class string.
   */
  titleClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().fontWeight('semibold'))
  }

  /**
   * Whether a field holds a node (an `ng-template` reference) rather than text.
   * @param value - The event field.
   * @returns True when it renders through a template outlet.
   */
  isNode(value: unknown): value is TemplateRef<unknown> {
    return value instanceof TemplateRef
  }

  /**
   * Narrows a value to an embedded template.
   * @param value - The event field.
   * @returns The template, or null.
   */
  templateOf(value: unknown): TemplateRef<unknown> | null {
    return value instanceof TemplateRef ? value : null
  }

  /**
   * The text a field renders (React renders strings and numbers as text).
   * @param value - The event field.
   * @returns The text, or `''` for a node field.
   */
  textOf(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  }
}
