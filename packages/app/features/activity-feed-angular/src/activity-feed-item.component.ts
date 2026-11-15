/**
 * ActivityFeedItem component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, TemplateRef } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Avatar } from '@molecule/app-ui-angular'

import type { ActivityFeedItemProps } from './types.js'

/**
 * ActivityFeedItem component.
 *
 * One entry in an activity feed. Shape: `[avatar|icon] [actor verb target ·
 * timestamp] [body]`. The host IS the row `<article>`
 * (`article[mol-activity-feed-item]`), matching React's root exactly. The
 * leading column renders the item's `icon` when supplied, otherwise a
 * `<div mol-avatar>` for `avatarSrc`, otherwise nothing — React's
 * `icon ?? (avatarSrc ? … : null)`. Node-valued fields are `ng-template`
 * references rendered through `NgTemplateOutlet`; string / number fields render
 * as text.
 */
@Component({
  selector: 'article[mol-activity-feed-item]',
  standalone: true,
  imports: [NgTemplateOutlet, Avatar],
  inputs: ['item', 'className'],
  host: {
    '[class]': 'classes()',
  },
  // The template's whitespace is semantic: Angular keeps whitespace-only text
  // nodes between inline elements, so the line's content is glued and the
  // single spaces React renders around the verb are explicit interpolations.
  // prettier-ignore
  template: `<div [class]="leadingClasses()">@if (item.icon != null) {@if (isNode(item.icon)) {<ng-container [ngTemplateOutlet]="templateOf(item.icon)"></ng-container>}@else {{{ textOf(item.icon) }}}}@else if (item.avatarSrc) {<div mol-avatar [src]="item.avatarSrc" [size]="avatarSize()"></div>}</div><div [class]="bodyClasses()"><div [class]="lineClasses()"><span [class]="cm().fontWeight('semibold')">@if (isNode(item.actor)) {<ng-container [ngTemplateOutlet]="templateOf(item.actor)"></ng-container>}@else {{{ textOf(item.actor) }}}</span>@if (isNode(item.verb)) {{{ ' ' }}<ng-container [ngTemplateOutlet]="templateOf(item.verb)"></ng-container>{{ ' ' }}}@else {{{ ' ' + textOf(item.verb) + ' ' }}}@if (item.target) {<span [class]="cm().fontWeight('medium')">@if (isNode(item.target)) {<ng-container [ngTemplateOutlet]="templateOf(item.target)"></ng-container>}@else {{{ textOf(item.target) }}}</span>}<span [class]="timeClasses()">@if (isNode(item.timestamp)) {{{ ' · ' }}<ng-container [ngTemplateOutlet]="templateOf(item.timestamp)"></ng-container>}@else {{{ ' · ' + textOf(item.timestamp) }}}</span></div>@if (item.body) {<div [class]="bodyTextClasses()">@if (isNode(item.body)) {<ng-container [ngTemplateOutlet]="templateOf(item.body)"></ng-container>}@else {{{ textOf(item.body) }}}</div>}</div>`,
})
export class ActivityFeedItem {
  /** The row to render (required, as in React's props). */
  item!: ActivityFeedItemProps['item']
  /** Extra classes on the row wrapper. */
  className?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the row's class list (`cm.flex({ align: 'start', gap: 'sm' })` +
   * `className`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().flex({ align: 'start', gap: 'sm' }), this.className)
  }

  /**
   * Computes the leading column's class (`cm.shrink0`).
   * @returns The class string.
   */
  leadingClasses(): string {
    return this.cm().cn(this.cm().shrink0)
  }

  /**
   * Computes the body block's class (`cm.textSize('sm')`).
   * @returns The class string.
   */
  bodyTextClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'))
  }

  /**
   * Computes the actor/body column's class list (`cm.flex1` + `cm.stack(1)`).
   * @returns The class string.
   */
  bodyClasses(): string {
    return this.cm().cn(this.cm().flex1, this.cm().stack(1))
  }

  /**
   * Computes the first line's class (`cm.textSize('sm')`).
   * @returns The class string.
   */
  lineClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'))
  }

  /**
   * The timestamp span's class (`cm.sp('ml', 2)` + `cm.textSize('xs')`).
   * @returns The class string.
   */
  timeClasses(): string {
    return this.cm().cn(this.cm().sp('ml', 2), this.cm().textSize('xs'))
  }

  /**
   * The avatar size passed to `<div mol-avatar>` (React's `size="sm"`).
   * @returns The size preset.
   */
  avatarSize(): 'sm' {
    return 'sm'
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
