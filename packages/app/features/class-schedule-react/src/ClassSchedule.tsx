import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/**
 * A single event on the weekly schedule grid.
 *
 * `start` and `end` are minute offsets from midnight (`0`–`1440`). For
 * example a class running 09:00–10:30 is `{ start: 540, end: 630 }`.
 */
export interface ScheduleEvent {
  /** Stable identifier (used as React key + passed to click handlers). */
  id: string
  /** ISO weekday: `0` = Sunday, `1` = Monday … `6` = Saturday. */
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6
  /** Start time in minutes from midnight (e.g. `540` = 09:00). */
  start: number
  /** End time in minutes from midnight (e.g. `630` = 10:30). */
  end: number
  /** Primary label rendered inside the event tile. */
  title: ReactNode
  /** Secondary line — typically room or location. */
  subtitle?: ReactNode
  /** Tertiary line — typically teacher or instructor. */
  meta?: ReactNode
  /** Optional accent color applied as a left border on the tile. */
  accentColor?: string
}

/**
 * Empty-slot click payload — `weekday` plus the start of the clicked hour
 * (in minutes from midnight, snapped down to the row).
 */
export interface ScheduleSlot {
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6
  /** Hour-of-day boundary in minutes (e.g. `540` for the 09:00 row). */
  start: number
}

/**
 *
 */
export interface ClassScheduleProps {
  /** Events to render. */
  events: ScheduleEvent[]
  /** First day-of-week (`0` = Sunday, `1` = Monday). Defaults to `1`. */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6
  /** Visible hour range as `[startHour, endHour]` in 24-hour clock. Defaults to `[8, 18]`. */
  dayHours?: [number, number]
  /** Pixel height of one hour row. Defaults to `60`. */
  cellHeight?: number
  /** Whether to show Saturday + Sunday columns. Defaults to `true`. */
  showWeekendCols?: boolean
  /** Locale for weekday name formatting (passes through to `Intl.DateTimeFormat`). */
  locale?: string
  /** Called when an event tile is clicked. */
  onEventClick?: (event: ScheduleEvent) => void
  /** Called when an empty grid cell is clicked. */
  onSlotClick?: (slot: ScheduleSlot) => void
  /** Extra classes for the root container. */
  className?: string
}

const MINUTES_PER_HOUR = 60
const DAYS_PER_WEEK = 7
const WEEKEND_DAYS = new Set<number>([0, 6])

/**
 * Format a minute-of-day value (0–1440) as `HH:MM` 24-hour clock.
 *
 * @param minutes - Minutes from midnight.
 * @returns Zero-padded `HH:MM` string.
 */
export function formatHourLabel(minutes: number): string {
  const h = Math.floor(minutes / MINUTES_PER_HOUR)
  const m = minutes % MINUTES_PER_HOUR
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Lay out events that share a weekday into non-overlapping side-by-side
 * lanes. Each event gets a `lane` index (0…N) and a `lanes` count for the
 * group it belongs to so the caller can compute width/left as
 * `width = (1/lanes) * 100%` / `left = (lane/lanes) * 100%`.
 *
 * @param events - Events occurring on a single weekday.
 * @returns Array of `{ event, lane, lanes }` records, in input order.
 */
export function assignLanes<E extends { start: number; end: number }>(
  events: E[],
): Array<{ event: E; lane: number; lanes: number }> {
  const sorted = events
    .map((event, originalIndex) => ({ event, originalIndex }))
    .sort((a, b) => a.event.start - b.event.start || a.event.end - b.event.end)

  // Greedy lane assignment per overlap group.
  type Assigned = { event: E; lane: number; originalIndex: number }
  const groups: Assigned[][] = []
  let current: Assigned[] = []
  let currentMaxEnd = -Infinity
  for (const { event, originalIndex } of sorted) {
    if (event.start >= currentMaxEnd && current.length > 0) {
      groups.push(current)
      current = []
      currentMaxEnd = -Infinity
    }
    // Find lowest free lane in `current`.
    const taken = new Set(current.filter((a) => a.event.end > event.start).map((a) => a.lane))
    let lane = 0
    while (taken.has(lane)) lane++
    current.push({ event, lane, originalIndex })
    if (event.end > currentMaxEnd) currentMaxEnd = event.end
  }
  if (current.length > 0) groups.push(current)

  const result: Array<{ event: E; lane: number; lanes: number; originalIndex: number }> = []
  for (const group of groups) {
    const lanes = group.reduce((max, a) => Math.max(max, a.lane + 1), 1)
    for (const a of group) result.push({ ...a, lanes })
  }
  result.sort((a, b) => a.originalIndex - b.originalIndex)
  return result.map(({ event, lane, lanes }) => ({ event, lane, lanes }))
}

/**
 * Weekly class-schedule grid. Renders a 7-column (or 5-column when
 * `showWeekendCols` is `false`) timetable with hour rows down the left
 * and absolutely positioned event tiles inside each day column. Events
 * that overlap on the same weekday are split into side-by-side lanes.
 *
 * Suitable for school timetables, virtual-classroom schedules, gym
 * class calendars, conference tracks, or any weekly recurring time
 * grid.
 *
 * @param props - Component props.
 * @param props.events - Events to render.
 * @param props.weekStartsOn - First day-of-week (`0` Sun, `1` Mon).
 * @param props.dayHours - Visible hour range `[start, end]`.
 * @param props.cellHeight - Pixel height per hour row.
 * @param props.showWeekendCols - Hide Sat + Sun when `false`.
 * @param props.locale - Locale for weekday names.
 * @param props.onEventClick - Click handler for event tiles.
 * @param props.onSlotClick - Click handler for empty grid cells.
 * @param props.className - Extra classes for the root container.
 * @returns The rendered schedule grid.
 */
export function ClassSchedule({
  events,
  weekStartsOn = 1,
  dayHours = [8, 18],
  cellHeight = 60,
  showWeekendCols = true,
  locale,
  onEventClick,
  onSlotClick,
  className,
}: ClassScheduleProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const [startHour, endHour] = dayHours
  const safeStart = Math.max(0, Math.min(23, Math.floor(startHour)))
  const safeEnd = Math.max(safeStart + 1, Math.min(24, Math.floor(endHour)))
  const startMinutes = safeStart * MINUTES_PER_HOUR
  const endMinutes = safeEnd * MINUTES_PER_HOUR
  const totalMinutes = endMinutes - startMinutes
  const hourCount = safeEnd - safeStart

  // Column ordering: rotate weekdays so `weekStartsOn` is first.
  const allWeekdays: Array<0 | 1 | 2 | 3 | 4 | 5 | 6> = [0, 1, 2, 3, 4, 5, 6]
  const rotated = [
    ...allWeekdays.slice(weekStartsOn),
    ...allWeekdays.slice(0, weekStartsOn),
  ] as Array<0 | 1 | 2 | 3 | 4 | 5 | 6>
  const visibleWeekdays = showWeekendCols ? rotated : rotated.filter((d) => !WEEKEND_DAYS.has(d))

  // Localized weekday header. Use a known reference Sunday (1970-01-04 was a Sunday)
  // so each weekday number maps to a real Date the formatter can render.
  const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  /**
   *
   * @param weekday
   */
  function weekdayLabel(weekday: number): string {
    // 1970-01-04 = Sunday → add `weekday` days to get the right name.
    return weekdayFmt.format(new Date(Date.UTC(1970, 0, 4 + weekday)))
  }

  // Group events by weekday + run lane assignment per day.
  const eventsByDay = new Map<number, ScheduleEvent[]>()
  for (const event of events) {
    if (!visibleWeekdays.includes(event.weekday)) continue
    const list = eventsByDay.get(event.weekday) ?? []
    list.push(event)
    eventsByDay.set(event.weekday, list)
  }

  const totalHeightPx = hourCount * cellHeight

  return (
    <div
      className={cm.cn(className)}
      data-mol-id="class-schedule"
      role="grid"
      aria-label={t('classSchedule.aria.region', {}, { defaultValue: 'Weekly class schedule' })}
    >
      <div
        className={cm.cn(cm.grid({ cols: visibleWeekdays.length + 1, gap: 'none' }))}
        style={{
          gridTemplateColumns: `auto repeat(${visibleWeekdays.length}, minmax(0, 1fr))`,
        }}
      >
        {/* Header row */}
        <div
          className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.sp('p', 2))}
          aria-hidden="true"
        />
        {visibleWeekdays.map((weekday) => (
          <div
            key={`head-${weekday}`}
            role="columnheader"
            data-mol-id="class-schedule-day-header"
            data-weekday={weekday}
            className={cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              cm.textCenter,
              cm.sp('p', 2),
            )}
          >
            {weekdayLabel(weekday)}
          </div>
        ))}

        {/* Time-axis column */}
        <div
          data-mol-id="class-schedule-time-axis"
          className={cm.cn(cm.position('relative'))}
          style={{ height: `${totalHeightPx}px` }}
        >
          {Array.from({ length: hourCount }).map((_, i) => {
            const hourMinutes = startMinutes + i * MINUTES_PER_HOUR
            return (
              <div
                key={`hour-${i}`}
                data-mol-id="class-schedule-hour-label"
                className={cm.cn(cm.textSize('xs'), cm.sp('px', 2))}
                style={{
                  position: 'absolute',
                  top: `${i * cellHeight}px`,
                  height: `${cellHeight}px`,
                  right: 0,
                  left: 0,
                  textAlign: 'right',
                }}
              >
                {formatHourLabel(hourMinutes)}
              </div>
            )
          })}
        </div>

        {/* Day columns */}
        {visibleWeekdays.map((weekday) => {
          const dayEvents = eventsByDay.get(weekday) ?? []
          const laned = assignLanes(dayEvents)
          return (
            <div
              key={`col-${weekday}`}
              role="presentation"
              data-mol-id="class-schedule-day-column"
              data-weekday={weekday}
              className={cm.cn(cm.position('relative'))}
              style={{ height: `${totalHeightPx}px` }}
            >
              {/* Empty-slot click targets — one button per hour row. */}
              {Array.from({ length: hourCount }).map((_, i) => {
                const slotStart = startMinutes + i * MINUTES_PER_HOUR
                return (
                  <button
                    key={`slot-${weekday}-${i}`}
                    type="button"
                    data-mol-id="class-schedule-slot"
                    data-weekday={weekday}
                    data-start={slotStart}
                    aria-label={t(
                      'classSchedule.aria.slot',
                      { weekday: weekdayLabel(weekday), time: formatHourLabel(slotStart) },
                      { defaultValue: 'Empty slot, {{weekday}} {{time}}' },
                    )}
                    onClick={() => onSlotClick?.({ weekday, start: slotStart })}
                    style={{
                      position: 'absolute',
                      top: `${i * cellHeight}px`,
                      left: 0,
                      right: 0,
                      height: `${cellHeight}px`,
                      background: 'transparent',
                      border: 0,
                      padding: 0,
                      cursor: onSlotClick ? 'pointer' : 'default',
                    }}
                  />
                )
              })}
              {/* Event tiles */}
              {laned.map(({ event, lane, lanes }) => {
                const eventStart = Math.max(event.start, startMinutes)
                const eventEnd = Math.min(event.end, endMinutes)
                if (eventEnd <= eventStart) return null
                const topPx = ((eventStart - startMinutes) / totalMinutes) * totalHeightPx
                const heightPx = ((eventEnd - eventStart) / totalMinutes) * totalHeightPx
                const leftPct = (lane / lanes) * 100
                const widthPct = (1 / lanes) * 100
                return (
                  <button
                    key={event.id}
                    type="button"
                    data-mol-id="class-schedule-event"
                    data-event-id={event.id}
                    aria-label={t(
                      'classSchedule.aria.event',
                      {
                        weekday: weekdayLabel(weekday),
                        start: formatHourLabel(event.start),
                        end: formatHourLabel(event.end),
                      },
                      { defaultValue: '{{weekday}} {{start}} – {{end}}' },
                    )}
                    onClick={() => onEventClick?.(event)}
                    className={cm.cn(
                      cm.flex({ direction: 'col', align: 'start' }),
                      cm.sp('p', 1),
                      cm.textSize('xs'),
                      cm.fontWeight('semibold'),
                    )}
                    style={{
                      position: 'absolute',
                      top: `${topPx}px`,
                      height: `${heightPx}px`,
                      left: `calc(${leftPct}% + 2px)`,
                      width: `calc(${widthPct}% - 4px)`,
                      overflow: 'hidden',
                      textAlign: 'left',
                      cursor: onEventClick ? 'pointer' : 'default',
                      borderLeft: event.accentColor ? `3px solid ${event.accentColor}` : undefined,
                    }}
                  >
                    <span data-mol-id="class-schedule-event-title">{event.title}</span>
                    {event.subtitle && (
                      <span
                        data-mol-id="class-schedule-event-subtitle"
                        className={cm.cn(cm.textSize('xs'), cm.fontWeight('normal'))}
                      >
                        {event.subtitle}
                      </span>
                    )}
                    {event.meta && (
                      <span
                        data-mol-id="class-schedule-event-meta"
                        className={cm.cn(cm.textSize('xs'), cm.fontWeight('normal'))}
                      >
                        {event.meta}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
