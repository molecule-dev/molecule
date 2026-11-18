/**
 * ClassSchedule component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, EventEmitter, Output, TemplateRef } from '@angular/core'

import { useLocale, useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { assignLanes, formatHourLabel } from './helpers.js'
import type { ScheduleEvent, ScheduleSlot } from './types.js'

/** An ISO weekday number. */
type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** Minutes in one hour. */
const MINUTES_PER_HOUR = 60

/** Weekday numbers that fall on the weekend (`0` = Sunday, `6` = Saturday). */
const WEEKEND_DAYS = new Set<number>([0, 6])

/** The ISO weekday numbers, Sunday first. */
const ALL_WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6]

/**
 * Next value of the module-wide schedule id counter (React `useId()`'s
 * counterpart): the day headers' ids are derived from it, and each day column
 * names its header through `aria-labelledby`.
 */
let nextBaseId = 0

/** One positioned event tile. */
interface TileModel {
  event: ScheduleEvent
  topPx: number
  heightPx: number
  leftPct: number
  widthPct: number
  label: string
}

/**
 * Weekly class-schedule grid. Renders a 7-column (or 5-column when
 * `showWeekendCols` is `false`) timetable with hour rows down the left
 * and absolutely positioned event tiles inside each day column. Events
 * that overlap on the same weekday are split into side-by-side lanes.
 *
 * The host IS the outer `<div>` (`div[mol-class-schedule]`), matching React's
 * root exactly. Node-valued event lines (`title`, `subtitle`, `meta`) take a
 * `TemplateRef`, rendered through `NgTemplateOutlet`.
 */
@Component({
  selector: 'div[mol-class-schedule]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: [
    'events',
    'weekStartsOn',
    'dayHours',
    'cellHeight',
    'showWeekendCols',
    'locale',
    'className',
  ],
  host: {
    'data-mol-id': 'class-schedule',
    role: 'group',
    '[class]': 'rootClasses()',
    '[attr.aria-label]': 'regionLabel()',
  },
  template: `<div [class]="gridClasses()" [attr.style]="gridStyle()">
    <div [class]="spacerClasses()" aria-hidden="true"></div>
    @for (weekday of visibleWeekdays(); track weekday) {
      <div
        [attr.id]="dayHeaderId(weekday)"
        data-mol-id="class-schedule-day-header"
        [attr.data-weekday]="weekday"
        [class]="dayHeaderClasses()"
      >
        {{ weekdayLabel(weekday) }}
      </div>
    }
    <div
      data-mol-id="class-schedule-time-axis"
      [class]="relativeClasses()"
      [attr.style]="axisStyle()"
    >
      @for (index of hours(); track index) {
        <div
          data-mol-id="class-schedule-hour-label"
          [class]="hourLabelClasses()"
          [attr.style]="hourLabelStyle(index)"
        >
          {{ formatHourLabel(startMinutes() + index * MINUTES_PER_HOUR) }}
        </div>
      }
    </div>
    <!-- Day columns — each one a "group" named by its weekday header. -->
    @for (weekday of visibleWeekdays(); track weekday) {
      <div
        role="group"
        [attr.aria-labelledby]="dayHeaderId(weekday)"
        data-mol-id="class-schedule-day-column"
        [attr.data-weekday]="weekday"
        [class]="relativeClasses()"
        [attr.style]="columnStyle()"
      >
        <!-- Empty-slot click targets — one button per hour row, only while a
             "slotClick" listener is set: a focusable button that does nothing
             would be a keyboard trap. -->
        @if (hasSlotClick()) {
          @for (index of hours(); track index) {
            <button
              type="button"
              data-mol-id="class-schedule-slot"
              [attr.data-weekday]="weekday"
              [attr.data-start]="startMinutes() + index * MINUTES_PER_HOUR"
              [attr.aria-label]="slotLabel(weekday, index)"
              (click)="emitSlot(weekday, index)"
              [attr.style]="slotStyle(index)"
            ></button>
          }
        }
        @for (tile of tilesFor(weekday); track tile.event.id) {
          <!-- A button only while an "eventClick" listener is set:
               without a handler the tile is static content — a focusable
               button that does nothing would be a keyboard trap. -->
          @if (hasEventClick()) {
            <button
              type="button"
              data-mol-id="class-schedule-event"
              [attr.data-event-id]="tile.event.id"
              (click)="eventClick.emit(tile.event)"
              [class]="tileClasses(tile.event)"
              [attr.style]="tileStyle(tile)"
            >
              <span data-mol-id="class-schedule-event-title">
                @if (templateOf(tile.event.title); as tpl) {
                  <ng-container [ngTemplateOutlet]="tpl" />
                } @else {
                  {{ textOf(tile.event.title) }}
                }
              </span>
              @if (tile.event.subtitle) {
                <span data-mol-id="class-schedule-event-subtitle" [class]="subtitleClasses()">
                  @if (templateOf(tile.event.subtitle); as tpl) {
                    <ng-container [ngTemplateOutlet]="tpl" />
                  } @else {
                    {{ textOf(tile.event.subtitle) }}
                  }
                </span>
              }
              @if (tile.event.meta) {
                <span data-mol-id="class-schedule-event-meta" [class]="metaClasses(tile.event)">
                  @if (templateOf(tile.event.meta); as tpl) {
                    <ng-container [ngTemplateOutlet]="tpl" />
                  } @else {
                    {{ textOf(tile.event.meta) }}
                  }
                </span>
              }
              <!-- The tile's accessible name is its content — title,
                   subtitle, meta, then the time, through a visually hidden
                   run (the former "aria-label" REPLACED that content as the
                   name, so a screen reader never heard the class). -->
              <span [class]="srOnlyClasses()">{{ tile.label }}</span>
            </button>
          } @else {
            <div
              data-mol-id="class-schedule-event"
              [attr.data-event-id]="tile.event.id"
              [class]="tileClasses(tile.event)"
              [attr.style]="tileStyle(tile)"
            >
              <span data-mol-id="class-schedule-event-title">
                @if (templateOf(tile.event.title); as tpl) {
                  <ng-container [ngTemplateOutlet]="tpl" />
                } @else {
                  {{ textOf(tile.event.title) }}
                }
              </span>
              @if (tile.event.subtitle) {
                <span data-mol-id="class-schedule-event-subtitle" [class]="subtitleClasses()">
                  @if (templateOf(tile.event.subtitle); as tpl) {
                    <ng-container [ngTemplateOutlet]="tpl" />
                  } @else {
                    {{ textOf(tile.event.subtitle) }}
                  }
                </span>
              }
              @if (tile.event.meta) {
                <span data-mol-id="class-schedule-event-meta" [class]="metaClasses(tile.event)">
                  @if (templateOf(tile.event.meta); as tpl) {
                    <ng-container [ngTemplateOutlet]="tpl" />
                  } @else {
                    {{ textOf(tile.event.meta) }}
                  }
                </span>
              }
              <span [class]="srOnlyClasses()">{{ tile.label }}</span>
            </div>
          }
        }
      </div>
    }
  </div>`,
})
export class ClassSchedule {
  /** Events to render. */
  events: ScheduleEvent[] = []
  /** First day-of-week (`0` = Sunday, `1` = Monday). Defaults to `1` at read time. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  /** Visible hour range `[start, end]`. Defaults to `[8, 18]` at read time. */
  dayHours?: [number, number]
  /** Pixel height of one hour row. Defaults to `60` at read time. */
  cellHeight?: number
  /** Whether to show Saturday + Sunday columns. Defaults to `true` at read time. */
  showWeekendCols?: boolean
  /**
   * Locale for weekday name formatting. Defaults to the app's active locale
   * (`useLocale()`), so the names follow a locale switch; an explicit `locale`
   * still wins.
   */
  locale?: string
  /** Extra classes for the root container. */
  className?: string

  /** Called when an event tile is clicked (React's `onEventClick`). */
  @Output() readonly eventClick = new EventEmitter<ScheduleEvent>()
  /** Called when an empty grid cell is clicked (React's `onSlotClick`). */
  @Output() readonly slotClick = new EventEmitter<ScheduleSlot>()

  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()

  /** The app's active locale — the weekday names' default, read in the template. */
  private readonly activeLocale = useLocale()

  /**
   * Base of the day headers' ids, which the columns' `aria-labelledby` name
   * (React derives it from `useId()`; a per-instance counter gives each
   * instance its own).
   */
  readonly baseId = `class-schedule-${nextBaseId++}`

  /** Minutes in one hour, exposed to the template. */
  readonly MINUTES_PER_HOUR = MINUTES_PER_HOUR

  /** Formats a minute-of-day value as `HH:MM`, exposed to the template. */
  readonly formatHourLabel = formatHourLabel

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The clamped first visible hour.
   * @returns The hour (0–23).
   */
  safeStart(): number {
    const startHour = (this.dayHours ?? [8, 18])[0]
    return Math.max(0, Math.min(23, Math.floor(startHour)))
  }

  /**
   * The clamped last visible hour (at least one hour after {@link safeStart}).
   * @returns The hour (1–24).
   */
  safeEnd(): number {
    const endHour = (this.dayHours ?? [8, 18])[1]
    return Math.max(this.safeStart() + 1, Math.min(24, Math.floor(endHour)))
  }

  /**
   * The first visible minute of the day.
   * @returns Minutes from midnight.
   */
  startMinutes(): number {
    return this.safeStart() * MINUTES_PER_HOUR
  }

  /**
   * The last visible minute of the day.
   * @returns Minutes from midnight.
   */
  endMinutes(): number {
    return this.safeEnd() * MINUTES_PER_HOUR
  }

  /**
   * The number of visible minutes.
   * @returns Minutes covered by the grid.
   */
  totalMinutes(): number {
    return this.endMinutes() - this.startMinutes()
  }

  /**
   * The number of visible hour rows.
   * @returns The hour-row count.
   */
  hourCount(): number {
    return this.safeEnd() - this.safeStart()
  }

  /**
   * The visible hour row indexes.
   * @returns `0 … hourCount() - 1`.
   */
  hours(): number[] {
    return Array.from({ length: this.hourCount() }, (_, i) => i)
  }

  /**
   * The pixel height of one hour row (React's default parameter).
   * @returns The row height in pixels.
   */
  rowHeight(): number {
    return this.cellHeight ?? 60
  }

  /**
   * The total pixel height of the grid.
   * @returns The height in pixels.
   */
  totalHeightPx(): number {
    return this.hourCount() * this.rowHeight()
  }

  /**
   * The weekday columns, rotated so `weekStartsOn` is first and filtered to
   * weekdays when weekends are hidden.
   * @returns The visible weekday numbers.
   */
  visibleWeekdays(): Weekday[] {
    const weekStartsOn = this.weekStartsOn ?? 1
    const rotated = [...ALL_WEEKDAYS.slice(weekStartsOn), ...ALL_WEEKDAYS.slice(0, weekStartsOn)]
    return (this.showWeekendCols ?? true) ? rotated : rotated.filter((d) => !WEEKEND_DAYS.has(d))
  }

  /**
   * Localized short weekday name for a given ISO weekday number.
   *
   * Locale data, not phrases: the name is Intl output in the app's active
   * locale (an explicit `locale` input still wins), and it follows a locale
   * switch — the signal read here makes the template re-render on one.
   *
   * @param weekday - ISO weekday number (0 = Sunday … 6 = Saturday).
   * @returns Localized short weekday name, e.g. `"Mon"`.
   */
  weekdayLabel(weekday: number): string {
    // 1970-01-04 = Sunday → add `weekday` days to get the right name.
    const fmt = new Intl.DateTimeFormat(this.locale ?? this.activeLocale(), { weekday: 'short' })
    return fmt.format(new Date(Date.UTC(1970, 0, 4 + weekday)))
  }

  /**
   * Events grouped by visible weekday.
   * @returns A map from weekday number to its events, in input order.
   */
  eventsByDay(): Map<number, ScheduleEvent[]> {
    const byDay = new Map<number, ScheduleEvent[]>()
    const visible = this.visibleWeekdays()
    for (const event of this.events) {
      if (!visible.includes(event.weekday)) continue
      const list = byDay.get(event.weekday) ?? []
      list.push(event)
      byDay.set(event.weekday, list)
    }
    return byDay
  }

  /**
   * The positioned event tiles of one day column, in input order (events
   * outside the visible hours are dropped, as React returns `null` for them).
   *
   * @param weekday - The day column.
   * @returns The tiles to render.
   */
  tilesFor(weekday: number): TileModel[] {
    const startMinutes = this.startMinutes()
    const endMinutes = this.endMinutes()
    const totalMinutes = this.totalMinutes()
    const totalHeightPx = this.totalHeightPx()
    const tiles: TileModel[] = []
    for (const { event, lane, lanes } of assignLanes(this.eventsByDay().get(weekday) ?? [])) {
      const eventStart = Math.max(event.start, startMinutes)
      const eventEnd = Math.min(event.end, endMinutes)
      if (eventEnd <= eventStart) continue
      tiles.push({
        event,
        topPx: ((eventStart - startMinutes) / totalMinutes) * totalHeightPx,
        heightPx: ((eventEnd - eventStart) / totalMinutes) * totalHeightPx,
        leftPct: (lane / lanes) * 100,
        widthPct: (1 / lanes) * 100,
        label: this.i18n.t(
          'classSchedule.aria.event',
          {
            weekday: this.weekdayLabel(weekday),
            start: formatHourLabel(event.start),
            end: formatHourLabel(event.end),
          },
          { defaultValue: '{{weekday}} {{start}} – {{end}}' },
        ),
      })
    }
    return tiles
  }

  /**
   * The accessible label of one empty-slot hit target.
   *
   * @param weekday - The day column.
   * @param index - The hour row.
   * @returns The translated label.
   */
  slotLabel(weekday: number, index: number): string {
    const start = this.startMinutes() + index * MINUTES_PER_HOUR
    return this.i18n.t(
      'classSchedule.aria.slot',
      { weekday: this.weekdayLabel(weekday), time: formatHourLabel(start) },
      { defaultValue: 'Empty slot, {{weekday}} {{time}}' },
    )
  }

  /**
   * Emits the slot click payload for one empty grid cell.
   *
   * @param weekday - The day column.
   * @param index - The hour row.
   */
  emitSlot(weekday: Weekday, index: number): void {
    this.slotClick.emit({ weekday, start: this.startMinutes() + index * MINUTES_PER_HOUR })
  }

  /**
   * The translated region label for the root element.
   * @returns The label text.
   */
  regionLabel(): string {
    return this.i18n.t(
      'classSchedule.aria.region',
      {},
      {
        defaultValue: 'Weekly class schedule',
      },
    )
  }

  /**
   * The id of one weekday header (React's `useId()`-derived
   * `${baseId}-day-${weekday}`); the day column names it through
   * `aria-labelledby`.
   *
   * @param weekday - The day column.
   * @returns The generated id.
   */
  dayHeaderId(weekday: number): string {
    return `${this.baseId}-day-${weekday}`
  }

  /**
   * Whether a `slotClick` listener is set (React's `onSlotClick`): the slot
   * buttons render only then.
   * @returns True when the host listens for `slotClick`.
   */
  hasSlotClick(): boolean {
    return this.slotClick.observed
  }

  /**
   * Whether an `eventClick` listener is set (React's `onEventClick`): the
   * event tiles are buttons only then.
   * @returns True when the host listens for `eventClick`.
   */
  hasEventClick(): boolean {
    return this.eventClick.observed
  }

  /**
   * The visually hidden run's class (`cm.cn(cm.srOnly)`), which carries a
   * tile's time label into the accessible name.
   * @returns The class string.
   */
  srOnlyClasses(): string {
    return this.cm().cn(this.cm().srOnly)
  }

  /**
   * Whether a node-valued line is a `TemplateRef` the template renders.
   *
   * @param value - The line's value.
   * @returns The template, or `null` for a plain value.
   */
  templateOf(value: unknown): TemplateRef<unknown> | null {
    return value instanceof TemplateRef ? value : null
  }

  /**
   * The text of a plain node-valued line.
   *
   * @param value - The line's value.
   * @returns Its text, empty for a nullish value.
   */
  textOf(value: unknown): string {
    return value === null || value === undefined ? '' : String(value)
  }

  /**
   * The wrapper class list (React's `cm.cn(className)`).
   * @returns The class string.
   */
  rootClasses(): string {
    return this.cm().cn(this.className)
  }

  /**
   * The header row's empty spacer classes.
   * @returns The class string.
   */
  spacerClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.sp('p', 2))
  }

  /**
   * The grid wrapper classes.
   * @returns The class string.
   */
  gridClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.grid({ cols: this.visibleWeekdays().length + 1, gap: 'none' }))
  }

  /**
   * The grid wrapper's inline style.
   * @returns The style declarations.
   */
  gridStyle(): string {
    return `grid-template-columns: auto repeat(${this.visibleWeekdays().length}, minmax(0, 1fr))`
  }

  /**
   * The day header cells' classes.
   * @returns The class string.
   */
  dayHeaderClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.textCenter, cm.sp('p', 2))
  }

  /**
   * The hour label cells' classes.
   * @returns The class string.
   */
  hourLabelClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('xs'), cm.sp('px', 2))
  }

  /**
   * The `position: relative` wrapper classes (time axis + day columns).
   * @returns The class string.
   */
  relativeClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.position('relative'))
  }

  /**
   * The time axis's inline style.
   * @returns The style declarations.
   */
  axisStyle(): string {
    return `height: ${this.totalHeightPx()}px`
  }

  /**
   * One day column's inline style.
   * @returns The style declarations.
   */
  columnStyle(): string {
    return `height: ${this.totalHeightPx()}px`
  }

  /**
   * One hour label's inline style.
   *
   * @param index - The hour row.
   * @returns The style declarations.
   */
  hourLabelStyle(index: number): string {
    const height = this.rowHeight()
    return `position: absolute; top: ${index * height}px; height: ${height}px; right: 0px; left: 0px; text-align: right;`
  }

  /**
   * One slot hit target's inline style (an invisible overlay).
   *
   * @param index - The hour row.
   * @returns The style declarations.
   */
  slotStyle(index: number): string {
    const height = this.rowHeight()
    return `position: absolute; top: ${index * height}px; left: 0px; right: 0px; height: ${height}px; background: transparent; border: 0px; padding: 0px; cursor: pointer`
  }

  /**
   * One event tile's inline style.
   *
   * @param tile - The tile to style.
   * @returns The style declarations.
   */
  tileStyle(tile: TileModel): string {
    const style = `position: absolute; top: ${tile.topPx}px; height: ${tile.heightPx}px; left: calc(${tile.leftPct}% + 2px); width: calc(${tile.widthPct}% - 4px); overflow: hidden; text-align: left; cursor: ${this.eventClick.observed ? 'pointer' : 'default'}`
    // The caller's accentColor drives an inset bar (DESIGN.md → "Accent
    // bars") through the CSS variable, not a hard border-left.
    return tile.event.accentColor ? `${style}; --mol-accent: ${tile.event.accentColor}` : style
  }

  /**
   * One event tile's classes.
   *
   * @param event - The tile's event.
   * @returns The class string.
   */
  tileClasses(event: ScheduleEvent): string {
    const cm = this.cm()
    return cm.cn(
      cm.flex({ direction: 'col', align: 'start' }),
      cm.sp('p', 1),
      cm.textSize('xs'),
      cm.fontWeight('semibold'),
      event.accentColor && cm.accentCard({ tone: 'custom' }),
    )
  }

  /**
   * The subtitle line's classes.
   * @returns The class string.
   */
  subtitleClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('xs'), cm.fontWeight('normal'))
  }

  /**
   * The meta line's classes (the accent label when the tile carries a color).
   *
   * @param event - The tile's event.
   * @returns The class string.
   */
  metaClasses(event: ScheduleEvent): string {
    const cm = this.cm()
    return event.accentColor
      ? cm.accentCardLabel({ tone: 'custom' })
      : cm.cn(cm.textSize('xs'), cm.fontWeight('normal'))
  }
}
