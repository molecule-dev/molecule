/**
 * AuditLogRow component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, Input, TemplateRef } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { AuditLogEntry } from './types.js'

/**
 * AuditLogRow component.
 *
 * One audit / activity / event-log row. Shape: `[actor] [action] [target] ·
 * [timestamp]` with an optional `[old → new]` diff line and environment/trace
 * metadata. The host IS the root `<div>` (`div[mol-audit-log-row]`), matching
 * React's root exactly. With `onClick` the row is promoted to a real button in
 * the a11y tree — `role="button"`, `tabindex="0"`, the pointer cursor — and
 * Enter / Space activate it, matching native button keyboard semantics.
 * Node-valued `entry` fields are `ng-template` references rendered through
 * `NgTemplateOutlet`; string / number fields render as text.
 */
@Component({
  selector: 'div[mol-audit-log-row]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: ['onClick', 'className'],
  host: {
    '[class]': 'classes()',
    '[attr.role]': 'role()',
    '[attr.tabindex]': 'tabindex()',
    '[attr.data-mol-id]': '"audit-log-row"',
    '(click)': 'handleClick($event)',
    '(keydown)': 'handleKeyDown($event)',
  },
  // The template's whitespace is semantic: Angular keeps whitespace-only text
  // nodes between inline elements, so the row's content is glued and the
  // single spaces React renders between the spans are the explicit
  // interpolations (line breaks only at block-level boundaries).
  // prettier-ignore
  template: `<div [class]="stackClasses()">
  <div [class]="lineClasses()"><span [class]="actorClasses()">@if (isNode(entry.actor)) {<ng-container [ngTemplateOutlet]="entry.actor" />}@else {<ng-container>{{ textOf(entry.actor) }}</ng-container>}</span>{{ ' ' }}<span>@if (isNode(entry.action)) {<ng-container [ngTemplateOutlet]="entry.action" />}@else {<ng-container>{{ textOf(entry.action) }}</ng-container>}</span>{{ ' ' }}@if (entry.target) {<span [class]="targetClasses()">@if (isNode(entry.target)) {<ng-container [ngTemplateOutlet]="entry.target" />}@else {<ng-container>{{ textOf(entry.target) }}</ng-container>}</span>}<span [class]="timeClasses()">@if (isNode(entry.timestamp)) {· <ng-container [ngTemplateOutlet]="entry.timestamp" />}@else {{{ '· ' + textOf(entry.timestamp) }}}</span>@if (entry.environment) {<span [class]="environmentClasses()">@if (isNode(entry.environment)) {[<ng-container [ngTemplateOutlet]="entry.environment" />]}@else {{{ '[' + textOf(entry.environment) + ']' }}}</span>}</div>@if (showDelta()) {<div [class]="deltaClasses()">@if (entry.oldValue !== undefined) {<span [style.text-decoration]="'line-through'" [style.opacity]="0.7">@if (isNode(entry.oldValue)) {<ng-container [ngTemplateOutlet]="entry.oldValue" />}@else {<ng-container>{{ textOf(entry.oldValue) }}</ng-container>}</span>}@if (entry.oldValue !== undefined && entry.newValue !== undefined) {<span aria-hidden="true">→</span>}@if (entry.newValue !== undefined) {<span>@if (isNode(entry.newValue)) {<ng-container [ngTemplateOutlet]="entry.newValue" />}@else {<ng-container>{{ textOf(entry.newValue) }}</ng-container>}</span>}</div>}@if (entry.traceId) {<span [class]="traceClasses()">@if (isNode(entry.traceId)) {<ng-container [ngTemplateOutlet]="entry.traceId" />}@else {<ng-container>{{ textOf(entry.traceId) }}</ng-container>}</span>}
  </div>`,
})
export class AuditLogRow {
  /** The entry to display (required, as in React's props). */
  @Input({ required: true }) entry!: AuditLogEntry
  /** Click handler; React's `onClick` (also fired on Enter / Space). */
  onClick?: (event?: Event) => void
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
   * Whether the row is interactive (`onClick` supplied): React renders the
   * button role, tab stop and pointer cursor only then.
   * @returns True when clickable.
   */
  interactive(): boolean {
    return typeof this.onClick === 'function'
  }

  /**
   * Computes the root class list (`cm.flex({ align: 'start', gap: 'sm' })` +
   * `cm.sp('py', 2)` + the pointer cursor when clickable + `className`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'start', gap: 'sm' }),
      this.cm().sp('py', 2),
      this.onClick ? this.cm().cursorPointer : undefined,
      this.className,
    )
  }

  /**
   * The host element's `role` (a button only when clickable).
   * @returns `'button'` or null for no attribute.
   */
  role(): string | null {
    return this.interactive() ? 'button' : null
  }

  /**
   * The host element's tab stop (only when clickable).
   * @returns 0 or null for no attribute.
   */
  tabindex(): number | null {
    return this.interactive() ? 0 : null
  }

  /**
   * The inner stack's class (`cm.flex1` + `cm.stack(1)`).
   * @returns The class string.
   */
  stackClasses(): string {
    return this.cm().cn(this.cm().flex1, this.cm().stack(1))
  }

  /**
   * The first line's class (`cm.textSize('sm')`).
   * @returns The class string.
   */
  lineClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'))
  }

  /**
   * The actor span's class (`cm.fontWeight('semibold')`).
   * @returns The class string.
   */
  actorClasses(): string {
    return this.cm().fontWeight('semibold')
  }

  /**
   * The target span's class (`cm.fontWeight('medium')`).
   * @returns The class string.
   */
  targetClasses(): string {
    return this.cm().fontWeight('medium')
  }

  /**
   * The timestamp span's class (`cm.sp('ml', 2)` + `cm.textSize('xs')`).
   * @returns The class string.
   */
  timeClasses(): string {
    return this.cm().cn(this.cm().sp('ml', 2), this.cm().textSize('xs'))
  }

  /**
   * The environment span's class (`cm.sp('ml', 2)` + `cm.textSize('xs')` +
   * `cm.fontWeight('semibold')`).
   * @returns The class string.
   */
  environmentClasses(): string {
    return this.cm().cn(
      this.cm().sp('ml', 2),
      this.cm().textSize('xs'),
      this.cm().fontWeight('semibold'),
    )
  }

  /**
   * The delta line's class (`cm.flex({ align: 'center', gap: 'sm' })` +
   * `cm.textSize('xs')`).
   * @returns The class string.
   */
  deltaClasses(): string {
    return this.cm().cn(this.cm().flex({ align: 'center', gap: 'sm' }), this.cm().textSize('xs'))
  }

  /**
   * The trace span's class (`cm.textSize('xs')`).
   * @returns The class string.
   */
  traceClasses(): string {
    return this.cm().textSize('xs')
  }

  /**
   * Whether the old → new delta line renders (React's
   * `oldValue !== undefined || newValue !== undefined`).
   * @returns True when either value is set.
   */
  showDelta(): boolean {
    return this.entry?.oldValue !== undefined || this.entry?.newValue !== undefined
  }

  /**
   * Whether a field holds a node (an `ng-template` reference) rather than text.
   * @param value - The entry field.
   * @returns True when it renders through a template outlet.
   */
  isNode(value: unknown): value is TemplateRef<unknown> {
    return value instanceof TemplateRef
  }

  /**
   * The text a field renders (React renders strings and numbers as text).
   * @param value - The entry field.
   * @returns The text, or `''` for a node field.
   */
  textOf(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  }

  /** Runs the click handler the way React forwards the DOM event. */
  handleClick(event: Event): void {
    this.onClick?.(event)
  }

  /**
   * Activates the row on Enter / Space (React's `handleKeyDown`):
   * preventDefault, then the click handler with no event.
   * @param event - The keydown.
   */
  handleKeyDown(event: KeyboardEvent): void {
    const onClick = this.onClick
    if (!onClick) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick()
    }
  }
}
