/**
 * DayTimeline component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, TemplateRef } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { DayTimelineEvent } from './types.js'

/**
 * Format a fractional 24h hour as `H AM/PM` (e.g. `9.5` → `9:30 AM`).
 *
 * @param hour - Fractional 24h hour value.
 * @returns A short clock-style label.
 */
export function formatHour(hour: number): string {
  const hh = Math.floor(hour)
  const mm = Math.round((hour - hh) * 60)
  const period = hh >= 12 ? 'PM' : 'AM'
  const display = ((hh + 11) % 12) + 1
  return mm === 0 ? `${display} ${period}` : `${display}:${String(mm).padStart(2, '0')} ${period}`
}

/**
 * DayTimeline component.
 *
 * Vertical 24h day-of-events timeline. The host IS the root `<div>`
 * (`div[mol-day-timeline]`), matching React's root exactly: `role="list"` +
 * the accessible label on the host, the hour axis, the rail with its
 * gridlines and one absolutely-positioned card per event. Node-valued event
 * fields (`title`, `subtitle`) are `ng-template` references rendered through
 * {@link NgTemplateOutlet}; string / number fields render as text.
 */
@Component({
  selector: 'div[mol-day-timeline]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: [
    'events',
    'startHour',
    'endHour',
    'pxPerHour',
    'showAxisLabels',
    'dataMolId',
    'className',
  ],
  host: {
    role: 'list',
    '[class]': 'classes()',
    '[attr.data-mol-id]': "dataMolId ?? 'day-timeline'",
    '[attr.aria-label]': 'groupLabel()',
    '[style]': 'wrapperStyle()',
  },
  // prettier-ignore
  template: `
    @if (showAxis()) {
      <div aria-hidden="true" [style]="axisStyle()">
        @for (hour of ticks(); track hour) {
          <div [attr.data-axis-tick]="hour" [class]="tickClasses()" [style]="tickStyle(hour)">{{ tickLabel(hour) }}</div>
        }
      </div>
    }
    <div data-mol-id="day-timeline-rail" [class]="railClasses()" [style]="railStyle()">
      @for (hour of ticks(); track hour) {
        <div aria-hidden="true" [class]="gridlineClasses()" [style]="gridlineStyle(hour)"></div>
      }
      @for (event of events; track event.id) {
        <div role="listitem" [attr.data-event-id]="event.id" data-mol-id="day-timeline-event" [attr.aria-label]="eventAria(event)" [class]="eventCardClasses(event)" [style]="cardStyle(event)">
          @if (event.onClick) {
            <button type="button" data-mol-id="day-timeline-event-action" [attr.aria-label]="eventAria(event)" (click)="handleClick(event, $event)" [style]="contentStyle(event)">
              <div [class]="titleClasses()">@if (isTemplate(event.title)) {<ng-container [ngTemplateOutlet]="templateOf(event.title)"></ng-container>}@else {{{ textOf(event.title) }}}</div>
              @if (event.subtitle) {
                <div [class]="subtitleClasses(event)">@if (isTemplate(event.subtitle)) {<ng-container [ngTemplateOutlet]="templateOf(event.subtitle)"></ng-container>}@else {{{ textOf(event.subtitle) }}}</div>
              }
            </button>
          } @else {
            <div [style]="contentStyle(event)">
              <div [class]="titleClasses()">@if (isTemplate(event.title)) {<ng-container [ngTemplateOutlet]="templateOf(event.title)"></ng-container>}@else {{{ textOf(event.title) }}}</div>
              @if (event.subtitle) {
                <div [class]="subtitleClasses(event)">@if (isTemplate(event.subtitle)) {<ng-container [ngTemplateOutlet]="templateOf(event.subtitle)"></ng-container>}@else {{{ textOf(event.subtitle) }}}</div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class DayTimeline {
  /** Events to render on the timeline. */
  events: DayTimelineEvent[] = []
  /** First hour rendered (inclusive; defaults to `0` at read time). */
  startHour?: number
  /** Last hour rendered (exclusive; defaults to `24` at read time). */
  endHour?: number
  /** Pixel height per hour (defaults to `60` at read time). */
  pxPerHour?: number
  /** Whether to render the axis tick labels (defaults to `true` at read time). */
  showAxisLabels?: boolean
  /** `data-mol-id` attribute for AI-agent selectors. */
  dataMolId?: string
  /** Extra classes appended via the ClassMap `cn()` helper. */
  className?: string

  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Whether the axis tick labels render (React's `showAxisLabels = true`).
   * @returns True when the axis column renders.
   */
  showAxis(): boolean {
    return this.showAxisLabels ?? true
  }

  /**
   * The viewport's clamped first hour (React: `max(0, min(24, startHour))`).
   * @returns The safe start hour.
   */
  safeStart(): number {
    return Math.max(0, Math.min(24, this.startHour ?? 0))
  }

  /**
   * The viewport's clamped last hour (React: at least `startHour + 1`, at most 24).
   * @returns The safe end hour.
   */
  safeEnd(): number {
    return Math.max(this.safeStart() + 1, Math.min(24, this.endHour ?? 24))
  }

  /**
   * The pixel height of one hour (React's `pxPerHour = 60`).
   * @returns The hour height in pixels.
   */
  hourHeight(): number {
    return this.pxPerHour ?? 60
  }

  /**
   * The axis' total height.
   * @returns The height in pixels.
   */
  totalHeight(): number {
    return (this.safeEnd() - this.safeStart()) * this.hourHeight()
  }

  /**
   * The hour ticks in the visible window (React pre-builds the same list).
   * @returns The tick hours.
   */
  ticks(): number[] {
    const hours: number[] = []
    for (let hour = Math.ceil(this.safeStart()); hour < this.safeEnd(); hour += 1) hours.push(hour)
    return hours
  }

  /**
   * The wrapper's class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.className)
  }

  /**
   * The root's accessible label.
   * @returns The translated group label.
   */
  groupLabel(): string {
    return this.i18n.t('dayTimeline.group', {}, { defaultValue: 'Day timeline' })
  }

  /**
   * The root's inline style — the axis grid has no ClassMap resolver.
   * @returns The CSS text.
   */
  wrapperStyle(): string {
    const columns = this.showAxis() ? '64px 1fr' : '1fr'
    return `position: relative; display: grid; grid-template-columns: ${columns}; min-height: ${this.totalHeight()}px`
  }

  /**
   * The axis column's inline style.
   * @returns The CSS text.
   */
  axisStyle(): string {
    return `position: relative; height: ${this.totalHeight()}px`
  }

  /**
   * The rail's inline style; its divider from the axis labels is a class.
   * @returns The CSS text.
   */
  railStyle(): string {
    return `position: relative; height: ${this.totalHeight()}px`
  }

  /**
   * The rail's class list: the theme divider from the axis labels, only while
   * the axis shows.
   * @returns The class string.
   */
  railClasses(): string {
    return this.showAxis() ? this.cm().borderL : ''
  }

  /**
   * A tick label's class list (the small text recipe, muted).
   * @returns The class string.
   */
  tickClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('xs'), cm.textMuted)
  }

  /**
   * A tick label's inline style.
   * @param hour - The tick's hour.
   * @returns The CSS text.
   */
  tickStyle(hour: number): string {
    const top = (hour - this.safeStart()) * this.hourHeight()
    return `position: absolute; top: ${top}px; right: 8px; transform: translateY(-50%)`
  }

  /**
   * The text a tick label shows.
   * @param hour - The tick's hour.
   * @returns The formatted hour.
   */
  tickLabel(hour: number): string {
    return formatHour(hour)
  }

  /**
   * One gridline's class list (the theme's border color as a fill).
   * @returns The class string.
   */
  gridlineClasses(): string {
    return this.cm().bgBorder
  }

  /**
   * One gridline's inline style.
   * @param hour - The gridline's hour.
   * @returns The CSS text.
   */
  gridlineStyle(hour: number): string {
    const top = (hour - this.safeStart()) * this.hourHeight()
    return `position: absolute; top: ${top}px; left: 0px; right: 0px; height: 1px`
  }

  /**
   * The event card's class list: the accent-card recipe in the event's tone
   * (its own accent color, or the brand primary), over the theme's secondary
   * surface.
   * @param event - The event.
   * @returns The class string.
   */
  eventCardClasses(event: DayTimelineEvent): string {
    const cm = this.cm()
    return cm.cn(cm.accentCard({ tone: this.cardTone(event) }), cm.surfaceSecondary)
  }

  /**
   * The event's accent-card tone: its own `accentColor` when it has one, the
   * brand primary otherwise.
   * @param event - The event.
   * @returns The recipe tone.
   */
  cardTone(event: DayTimelineEvent): 'custom' | 'primary' {
    return event.accentColor ? 'custom' : 'primary'
  }

  /**
   * The event title's class list.
   * @returns The class string.
   */
  titleClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))
  }

  /**
   * The event subtitle's class list (the accent-card label recipe, in the
   * card's tone).
   * @param event - The event.
   * @returns The class string.
   */
  subtitleClasses(event: DayTimelineEvent): string {
    return this.cm().accentCardLabel({ tone: this.cardTone(event) })
  }

  /**
   * The event's clamped end hour (a 15-minute floor keeps tiny events
   * clickable).
   * @param event - The event.
   * @returns Its clamped end hour.
   */
  safeEndOf(event: DayTimelineEvent): number {
    return Math.max(event.endHour, event.startHour + 0.25)
  }

  /**
   * The event card's inline style — geometry only; its colors are ClassMap
   * classes.
   * @param event - The event.
   * @returns The CSS text.
   */
  cardStyle(event: DayTimelineEvent): string {
    const top = (event.startHour - this.safeStart()) * this.hourHeight()
    const height = Math.max(20, (this.safeEndOf(event) - event.startHour) * this.hourHeight())
    return [
      'position: absolute',
      `top: ${top}px`,
      'left: 6px',
      'right: 6px',
      `height: ${height}px`,
      'border-radius: 6px',
      'overflow: hidden',
      // The event's accent color drives an inset bar, not a border-left.
      // Without it the bar is the brand primary, through the recipe's
      // `primary` tone.
      ...(event.accentColor ? [`--mol-accent: ${event.accentColor}`] : []),
    ].join('; ')
  }

  /**
   * The content block's inline style: it fills the card so the whole surface
   * is the click target, and its 30px left padding keeps the text clear of
   * the accent bar.
   * @param event - The event the block belongs to.
   * @returns The CSS text.
   */
  contentStyle(event: DayTimelineEvent): string {
    const parts = [
      'position: absolute',
      'inset: 0px',
      'padding: 0.4rem 0.6rem 0.4rem 30px',
      'font: inherit',
      'color: inherit',
      'text-align: left',
    ]
    if (event.onClick) parts.push('cursor: pointer', 'background: transparent')
    return parts.join('; ')
  }

  /**
   * The event's accessible label, built from React's i18n key and default
   * message (only a plain string title is carried into it).
   * @param event - The event.
   * @returns The aria label.
   */
  eventAria(event: DayTimelineEvent): string {
    return this.i18n.t(
      'dayTimeline.event',
      {
        title: typeof event.title === 'string' ? event.title : '',
        start: formatHour(event.startHour),
        end: formatHour(this.safeEndOf(event)),
      },
      { defaultValue: '{{title}} from {{start}} to {{end}}' },
    )
  }

  /**
   * Calls an event's own click handler with the native event, as React's
   * `onClick={event.onClick}` does.
   * @param event - The event that was clicked.
   * @param native - The click event.
   */
  handleClick(event: DayTimelineEvent, native: Event): void {
    const onClick: ((click: Event) => void) | undefined = event.onClick
    onClick?.(native)
  }

  /**
   * Whether an event field holds a node (an `ng-template` reference) rather
   * than text.
   * @param value - The event field.
   * @returns True when it renders through a template outlet.
   */
  isTemplate(value: unknown): value is TemplateRef<unknown> {
    return value instanceof TemplateRef
  }

  /**
   * Narrows a value to an embedded template.
   * @param value - An event field.
   * @returns The template, or null.
   */
  templateOf(value: unknown): TemplateRef<unknown> | null {
    return value instanceof TemplateRef ? value : null
  }

  /**
   * The text an event field renders (React renders strings and numbers as
   * text).
   * @param value - The event field.
   * @returns The text, or `''` for a node value.
   */
  textOf(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  }
}
