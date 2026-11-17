/**
 * LogViewer component (React parity).
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

import type { ColorVariant, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { hasNodes, SlotGuard } from './slot-dom.js'
import type { LogEntry, LogLevel } from './types.js'

/** Severity badge tones: trace neutral → fatal red (themed). */
const LEVEL_TONE: Record<LogLevel, ColorVariant> = {
  trace: 'secondary',
  debug: 'info',
  info: 'success',
  warn: 'warning',
  error: 'error',
  fatal: 'error',
}

/**
 * Structured log viewer.
 *
 * One expandable `<details>` row per entry: timestamp + colored severity badge
 * + optional service label + single-line message, expanding to a trace id and
 * a JSON-formatted structured-data panel.
 *
 * React's root is the `<div role="log">` when it has something to render and
 * the bare `emptyState` when the list is empty, so the host is unwrapped
 * (`data-parity-unwrap`, `display: contents`) and the `<div>` is rendered
 * inside it. The empty state is projected content (`[slot=emptyState]`) or a
 * node-valued input, reconciled by {@link LogViewer.ngAfterViewInit} /
 * {@link LogViewer.ngAfterViewChecked} / {@link LogViewer.ngDoCheck} against
 * React's branch.
 *
 * Use for operational tooling, admin dashboards, debug views.
 */
@Component({
  selector: 'mol-log-viewer',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: ['entries', 'onToggle', 'className', 'emptyState'],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
  // prettier-ignore
  template: `<span #empty data-parity-unwrap style="display: contents">@if (emptyTemplate(); as emptyTpl) {<ng-container [ngTemplateOutlet]="emptyTpl" />}<ng-content select="[slot=emptyState]"></ng-content></span><div #log [class]="logClasses()" role="log">@for (entry of entries; track entry.id) {<details [attr.open]="isOpen(entry.id) ? '' : null" (toggle)="detailsToggle(entry.id, $event)"><summary [class]="summaryClasses()"><span [style]="timestampStyle()">@if (isNode(entry.timestamp)) {<ng-container [ngTemplateOutlet]="templateOf(entry.timestamp)" />}@else {{{ textOf(entry.timestamp) }}}</span><span [class]="levelClasses(entry.level)" [style]="levelStyle()">{{ entry.level }}</span>@if (entry.service) {<span [class]="serviceClasses()">@if (isNode(entry.service)) {<ng-container [ngTemplateOutlet]="templateOf(entry.service)" />}@else {{{ textOf(entry.service) }}}</span>}<span [class]="messageClasses()">@if (isNode(entry.message)) {<ng-container [ngTemplateOutlet]="templateOf(entry.message)" />}@else {{{ textOf(entry.message) }}}</span>@if (entry.traceId) {<span [style]="traceStyle()">@if (isNode(entry.traceId)) {<ng-container [ngTemplateOutlet]="templateOf(entry.traceId)" />}@else {{{ textOf(entry.traceId) }}}</span>}</summary>@if (entry.data !== undefined) {<pre [class]="dataClasses()" [style]="dataStyle()" [textContent]="dataText(entry.data)"></pre>}</details>}</div>`,
})
export class LogViewer implements AfterViewInit, AfterViewChecked, DoCheck {
  /** The log entries, rendered in order. */
  entries: LogEntry[] = []

  /** Called when an entry expands/collapses (React's `onToggle`). */
  onToggle?: (id: string, expanded: boolean) => void

  /** Extra classes on the list wrapper. */
  className?: string

  /** Empty-state content, as an input (a template ref from a props change). */
  emptyState?: unknown

  /** The expanded entry ids (React's internal `openIds` state). */
  private openIds: Set<string> = new Set()

  /** The projected empty-state capture point (unwrapped, so React's bare slot). */
  @ViewChild('empty') empty?: ElementRef<HTMLElement>

  /** The `<div role="log">` list wrapper (detached when the empty state renders). */
  @ViewChild('log') log?: ElementRef<HTMLElement>

  private readonly guard = new SlotGuard(inject(ElementRef), inject(Renderer2))

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Whether the entry with the given id is expanded.
   *
   * @param id - The entry id.
   * @returns True when expanded.
   */
  isOpen(id: string): boolean {
    return this.openIds.has(id)
  }

  /**
   * React's `<details onToggle>` handler: toggles only when the DOM's `open`
   * state moved away from the one this component tracks.
   *
   * @param id - The entry id.
   * @param event - The native toggle event.
   */
  detailsToggle(id: string, event: Event): void {
    const nowOpen = (event.target as HTMLDetailsElement).open
    if (nowOpen !== this.openIds.has(id)) this.toggle(id)
  }

  /**
   * Toggles the expanded state of the entry with the given id, then notifies
   * `onToggle` with the new state (React's `toggle`).
   *
   * @param id - The entry id.
   */
  toggle(id: string): void {
    const next = new Set(this.openIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    this.openIds = next
    this.onToggle?.(id, next.has(id))
  }

  /**
   * The text a structured-data panel renders: strings verbatim, anything else
   * pretty-printed with `JSON.stringify(…, null, 2)` (React's shape).
   *
   * @param data - The entry's structured data.
   * @returns The panel text.
   */
  dataText(data: unknown): string {
    return typeof data === 'string' ? data : JSON.stringify(data, null, 2)
  }

  /**
   * Whether a field holds a node (an `ng-template` reference) rather than text.
   *
   * @param value - The entry field.
   * @returns True when it renders through a template outlet.
   */
  isNode(value: unknown): value is TemplateRef<unknown> {
    return value instanceof TemplateRef
  }

  /**
   * Narrows a value to an embedded template.
   *
   * @param value - An entry field.
   * @returns The template, or null.
   */
  templateOf(value: unknown): TemplateRef<unknown> | null {
    return value instanceof TemplateRef ? value : null
  }

  /**
   * The empty state as an input template (a node passed as a prop rather than
   * projected as `[slot=emptyState]`), when there is one.
   *
   * @returns The empty-state template, or null.
   */
  emptyTemplate(): TemplateRef<unknown> | null {
    return this.emptyState instanceof TemplateRef ? this.emptyState : null
  }

  /**
   * The text a field renders (React renders strings and numbers as text).
   *
   * @param value - The entry field.
   * @returns The text, or `''` for a node field.
   */
  textOf(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  }

  /**
   * Computes the list wrapper class list (`cm.stack(1)` + `className`).
   * @returns The class string.
   */
  logClasses(): string {
    return this.cm().cn(this.cm().stack(1), this.className)
  }

  /**
   * Computes the summary class list (flex row + padding + small text + cursor).
   * @returns The class string.
   */
  summaryClasses(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', gap: 'sm' }),
      this.cm().sp('py', 1),
      this.cm().sp('px', 2),
      this.cm().textSize('xs'),
      this.cm().cursorPointer,
    )
  }

  /**
   * The service label's class (`cm.fontWeight('semibold')`).
   * @returns The class string.
   */
  serviceClasses(): string {
    return this.cm().fontWeight('semibold')
  }

  /**
   * The message span's class (`cm.flex1`).
   * @returns The class string.
   */
  messageClasses(): string {
    return this.cm().flex1
  }

  /**
   * The structured-data panel's class (`cm.sp('p', 3)` + `cm.textSize('xs')`).
   * @returns The class string.
   */
  dataClasses(): string {
    return this.cm().cn(this.cm().sp('p', 3), this.cm().textSize('xs'))
  }

  /**
   * The timestamp span's inline style (React's fixed 48px box).
   * @returns The style map.
   */
  timestampStyle(): Record<string, string> {
    return { width: '48px', 'text-align': 'right', opacity: '0.7' }
  }

  /**
   * The severity badge's class list (themed tone fill + inverse text).
   *
   * @param level - The entry's severity level.
   * @returns The class string.
   */
  levelClasses(level: LogLevel): string {
    return this.cm().cn(this.cm().bgTone(LEVEL_TONE[level]), this.cm().textOnTone)
  }

  /**
   * The severity badge's inline style (fixed box, uppercase text).
   *
   * @returns The style map.
   */
  levelStyle(): Record<string, string> {
    return {
      display: 'inline-block',
      'min-width': '48px',
      'text-align': 'center',
      padding: '0 6px',
      'border-radius': '4px',
      'font-weight': '700',
      'text-transform': 'uppercase',
    }
  }

  /**
   * The trace id span's inline style (dimmed).
   * @returns The style map.
   */
  traceStyle(): Record<string, string> {
    return { opacity: '0.6' }
  }

  /**
   * The structured-data panel's inline style (horizontal scrolling).
   * @returns The style map.
   */
  dataStyle(): Record<string, string> {
    return { 'overflow-x': 'auto' }
  }

  /**
   * Reconciles the projected empty state and the list wrapper against React's
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
   * Re-reconciles after each view update: a node-valued empty state that
   * arrives through an input renders into its outlet only during the update,
   * so the branch decision must be read afterwards.
   */
  ngAfterViewChecked(): void {
    this.reconcile()
  }

  /**
   * Applies React's condition: with no entries and an empty state, the empty
   * state renders bare and the list wrapper disappears; otherwise the wrapper
   * renders and the empty state is dropped.
   */
  private reconcile(): void {
    const empty = this.empty?.nativeElement
    const log = this.log?.nativeElement
    const hasEmpty = (this.entries?.length ?? 0) === 0 && hasNodes(empty)
    this.guard.toggle(empty, hasEmpty)
    this.guard.toggle(log, !hasEmpty)
  }
}
