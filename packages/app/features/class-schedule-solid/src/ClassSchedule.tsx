/**
 * Solid weekly class-schedule grid — the counterpart of
 * `@molecule/app-class-schedule-react`'s `ClassSchedule`: the same props
 * (React names), the same DOM for the same input.
 *
 * @module
 */

import { type Component, createMemo, createUniqueId, For } from 'solid-js'

import { useLocale, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { assignLanes, formatHourLabel } from './helpers.js'
import type { ClassScheduleProps, ScheduleEvent } from './types.js'

/** An ISO weekday number. */
type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** Minutes in one hour. */
const MINUTES_PER_HOUR = 60

/** Weekday numbers that fall on the weekend (`0` = Sunday, `6` = Saturday). */
const WEEKEND_DAYS = new Set<number>([0, 6])

/** The ISO weekday numbers, Sunday first. */
const ALL_WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6]

/** One rendered column header. */
interface HeaderModel {
  weekday: Weekday
  label: string
}

/** One hour label on the time axis. */
interface HourModel {
  index: number
  label: string
}

/** One empty-slot hit target. */
interface SlotModel {
  index: number
  weekday: Weekday
  start: number
  label: string
}

/** One positioned event tile. */
interface TileModel {
  event: ScheduleEvent
  topPx: number
  heightPx: number
  leftPct: number
  widthPct: number
  label: string
}

/** One day column: its hit targets and its event tiles. */
interface DayModel {
  weekday: Weekday
  slots: SlotModel[]
  tiles: TileModel[]
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
 * @param props - Component props (see {@link ClassScheduleProps}).
 * @returns The rendered schedule grid.
 */
export const ClassSchedule: Component<ClassScheduleProps> = (props) => {
  const { t } = useTranslation()
  // Base of the day headers' ids — the columns' `aria-labelledby` names them
  // (a generated id, never one derived from data).
  const baseId = createUniqueId()
  // Read inside the memo (below), so the weekday headers re-word on a locale switch.
  const activeLocale = useLocale()

  const model = createMemo(() => {
    const cm = getClassMap()

    const [startHour, endHour] = props.dayHours ?? [8, 18]
    const cellHeight = props.cellHeight ?? 60
    const safeStart = Math.max(0, Math.min(23, Math.floor(startHour)))
    const safeEnd = Math.max(safeStart + 1, Math.min(24, Math.floor(endHour)))
    const startMinutes = safeStart * MINUTES_PER_HOUR
    const endMinutes = safeEnd * MINUTES_PER_HOUR
    const totalMinutes = endMinutes - startMinutes
    const hourCount = safeEnd - safeStart
    const totalHeightPx = hourCount * cellHeight
    const hours = Array.from({ length: hourCount }, (_, i) => i)

    // Column ordering: rotate weekdays so `weekStartsOn` is first.
    const weekStartsOn = props.weekStartsOn ?? 1
    const rotated = [...ALL_WEEKDAYS.slice(weekStartsOn), ...ALL_WEEKDAYS.slice(0, weekStartsOn)]
    const visibleWeekdays =
      (props.showWeekendCols ?? true) ? rotated : rotated.filter((d) => !WEEKEND_DAYS.has(d))

    // Localized weekday header — locale data, not phrases, so it is Intl
    // output in the app's active locale (an explicit `locale` prop still
    // wins), and it follows a locale switch. Use a known reference Sunday
    // (1970-01-04 was a Sunday) so each weekday number maps to a real Date
    // the formatter renders.
    const weekdayFmt = new Intl.DateTimeFormat(props.locale ?? activeLocale(), {
      weekday: 'short',
    })
    const weekdayLabel = (weekday: number): string =>
      weekdayFmt.format(new Date(Date.UTC(1970, 0, 4 + weekday)))

    // Group events by weekday + run lane assignment per day.
    const eventsByDay = new Map<number, ScheduleEvent[]>()
    for (const event of props.events) {
      if (!visibleWeekdays.includes(event.weekday)) continue
      const list = eventsByDay.get(event.weekday) ?? []
      list.push(event)
      eventsByDay.set(event.weekday, list)
    }

    const headers: HeaderModel[] = visibleWeekdays.map((weekday) => ({
      weekday,
      label: weekdayLabel(weekday),
    }))

    const hourLabels: HourModel[] = hours.map((index) => ({
      index,
      label: formatHourLabel(startMinutes + index * MINUTES_PER_HOUR),
    }))

    const days: DayModel[] = visibleWeekdays.map((weekday) => {
      // Empty-slot hit targets exist only while `onSlotClick` is set: a
      // focusable button that does nothing would be a keyboard trap.
      const slots: SlotModel[] = props.onSlotClick
        ? hours.map((index) => {
            const start = startMinutes + index * MINUTES_PER_HOUR
            return {
              index,
              weekday,
              start,
              label: t(
                'classSchedule.aria.slot',
                { weekday: weekdayLabel(weekday), time: formatHourLabel(start) },
                { defaultValue: 'Empty slot, {{weekday}} {{time}}' },
              ),
            }
          })
        : []

      const tiles: TileModel[] = assignLanes(eventsByDay.get(weekday) ?? []).flatMap(
        ({ event, lane, lanes }) => {
          const eventStart = Math.max(event.start, startMinutes)
          const eventEnd = Math.min(event.end, endMinutes)
          if (eventEnd <= eventStart) return []
          return [
            {
              event,
              topPx: ((eventStart - startMinutes) / totalMinutes) * totalHeightPx,
              heightPx: ((eventEnd - eventStart) / totalMinutes) * totalHeightPx,
              leftPct: (lane / lanes) * 100,
              widthPct: (1 / lanes) * 100,
              label: t(
                'classSchedule.aria.event',
                {
                  weekday: weekdayLabel(weekday),
                  start: formatHourLabel(event.start),
                  end: formatHourLabel(event.end),
                },
                { defaultValue: '{{weekday}} {{start}} – {{end}}' },
              ),
            },
          ]
        },
      )

      return { weekday, slots, tiles }
    })

    return {
      cm,
      headers,
      hourLabels,
      days,
      totalHeightPx,
      gridColumns: `auto repeat(${visibleWeekdays.length}, minmax(0, 1fr))`,
      gridClasses: cm.cn(cm.grid({ cols: visibleWeekdays.length + 1, gap: 'none' })),
      rootLabel: t(
        'classSchedule.aria.region',
        {},
        {
          defaultValue: 'Weekly class schedule',
        },
      ),
    }
  })

  /**
   * The inline style of one slot hit target (an invisible overlay).
   *
   * @param slot - The slot.
   * @returns The style declarations, hyphenated for DOM `setProperty`.
   */
  const slotStyle = (slot: SlotModel): Record<string, string> => ({
    position: 'absolute',
    top: `${slot.index * (props.cellHeight ?? 60)}px`,
    left: '0px',
    right: '0px',
    height: `${props.cellHeight ?? 60}px`,
    background: 'transparent',
    border: '0px',
    padding: '0px',
    cursor: 'pointer',
  })

  /**
   * The inline style of one event tile.
   *
   * @param tile - The tile's geometry and event.
   * @returns The style declarations, hyphenated for DOM `setProperty`.
   */
  const tileStyle = (tile: TileModel): Record<string, string> => ({
    position: 'absolute',
    top: `${tile.topPx}px`,
    height: `${tile.heightPx}px`,
    left: `calc(${tile.leftPct}% + 2px)`,
    width: `calc(${tile.widthPct}% - 4px)`,
    overflow: 'hidden',
    'text-align': 'left',
    cursor: props.onEventClick ? 'pointer' : 'default',
    ...(tile.event.accentColor ? { '--mol-accent': tile.event.accentColor } : {}),
  })

  // A named `group`, not a `grid`: the layout is a CSS grid, not an ARIA
  // grid — it has no rows and no grid keyboard model, and `role="grid"`
  // would promise one (axe: aria-required-children).
  return (
    <div
      class={model().cm.cn(props.className)}
      data-mol-id="class-schedule"
      role="group"
      aria-label={model().rootLabel}
    >
      <div class={model().gridClasses} style={{ 'grid-template-columns': model().gridColumns }}>
        {/* Header row */}
        <div
          class={model().cm.cn(
            model().cm.textSize('xs'),
            model().cm.fontWeight('semibold'),
            model().cm.sp('p', 2),
          )}
          aria-hidden="true"
        />
        <For each={model().headers}>
          {(head) => (
            <div
              id={`${baseId}-day-${head.weekday}`}
              data-mol-id="class-schedule-day-header"
              data-weekday={head.weekday}
              class={model().cm.cn(
                model().cm.textSize('xs'),
                model().cm.fontWeight('semibold'),
                model().cm.textCenter,
                model().cm.sp('p', 2),
              )}
            >
              {head.label}
            </div>
          )}
        </For>

        {/* Time-axis column */}
        <div
          data-mol-id="class-schedule-time-axis"
          class={model().cm.cn(model().cm.position('relative'))}
          style={{ height: `${model().totalHeightPx}px` }}
        >
          <For each={model().hourLabels}>
            {(hour) => (
              <div
                data-mol-id="class-schedule-hour-label"
                class={model().cm.cn(model().cm.textSize('xs'), model().cm.sp('px', 2))}
                style={{
                  position: 'absolute',
                  top: `${hour.index * (props.cellHeight ?? 60)}px`,
                  height: `${props.cellHeight ?? 60}px`,
                  right: '0px',
                  left: '0px',
                  'text-align': 'right',
                }}
              >
                {hour.label}
              </div>
            )}
          </For>
        </div>

        {/* Day columns — each one a `group` named by its weekday header. */}
        <For each={model().days}>
          {(day) => (
            <div
              role="group"
              aria-labelledby={`${baseId}-day-${day.weekday}`}
              data-mol-id="class-schedule-day-column"
              data-weekday={day.weekday}
              class={model().cm.cn(model().cm.position('relative'))}
              style={{ height: `${model().totalHeightPx}px` }}
            >
              {/* Empty-slot click targets — one button per hour row. */}
              <For each={day.slots}>
                {(slot) => (
                  <button
                    type="button"
                    data-mol-id="class-schedule-slot"
                    data-weekday={slot.weekday}
                    data-start={slot.start}
                    aria-label={slot.label}
                    onClick={() =>
                      props.onSlotClick?.({ weekday: slot.weekday, start: slot.start })
                    }
                    /* mol-bespoke-button: an INVISIBLE hour-slot hit target,
                       absolutely positioned over the grid — it has no label,
                       no surface and no chrome, so the inline
                       background/border/padding are native resets. A
                       `cm.button()` fill would paint the empty grid. */
                    style={slotStyle(slot)}
                  />
                )}
              </For>
              {/* Event tiles */}
              <For each={day.tiles}>
                {(tile) => {
                  // The tile's accessible name is its content — title,
                  // subtitle, meta, then the time, through a visually hidden
                  // run (the former `aria-label` REPLACED that content as the
                  // name, so a screen reader never heard the class).
                  const children = (
                    <>
                      <span data-mol-id="class-schedule-event-title">{tile.event.title}</span>
                      {tile.event.subtitle && (
                        <span
                          data-mol-id="class-schedule-event-subtitle"
                          class={model().cm.cn(
                            model().cm.textSize('xs'),
                            model().cm.fontWeight('normal'),
                          )}
                        >
                          {tile.event.subtitle}
                        </span>
                      )}
                      {tile.event.meta && (
                        <span
                          data-mol-id="class-schedule-event-meta"
                          class={
                            tile.event.accentColor
                              ? model().cm.accentCardLabel({ tone: 'custom' })
                              : model().cm.cn(
                                  model().cm.textSize('xs'),
                                  model().cm.fontWeight('normal'),
                                )
                          }
                        >
                          {tile.event.meta}
                        </span>
                      )}
                      <span class={model().cm.srOnly}>{tile.label}</span>
                    </>
                  )
                  // A `<button>` only while `onEventClick` is set: without a
                  // handler the tile is static content — a focusable button
                  // that does nothing would be a keyboard trap.
                  return props.onEventClick ? (
                    <button
                      type="button"
                      data-mol-id="class-schedule-event"
                      data-event-id={tile.event.id}
                      onClick={() => props.onEventClick?.(tile.event)}
                      class={model().cm.cn(
                        model().cm.flex({ direction: 'col', align: 'start' }),
                        model().cm.sp('p', 1),
                        model().cm.textSize('xs'),
                        model().cm.fontWeight('semibold'),
                        // The caller's accentColor drives an inset bar (DESIGN.md →
                        // "Accent bars"), not a hard border-left.
                        tile.event.accentColor && model().cm.accentCard({ tone: 'custom' }),
                      )}
                      /* mol-bespoke-button: a calendar EVENT TILE, not a CTA —
                         it is absolutely positioned and sized from the event's
                         start/end times and lane, and its accent bar carries
                         the caller's own `accentColor` (data, not a design
                         token). No `cm.button()` tier can express either. */
                      style={tileStyle(tile)}
                    >
                      {children}
                    </button>
                  ) : (
                    <div
                      data-mol-id="class-schedule-event"
                      data-event-id={tile.event.id}
                      class={model().cm.cn(
                        model().cm.flex({ direction: 'col', align: 'start' }),
                        model().cm.sp('p', 1),
                        model().cm.textSize('xs'),
                        model().cm.fontWeight('semibold'),
                        tile.event.accentColor && model().cm.accentCard({ tone: 'custom' }),
                      )}
                      style={tileStyle(tile)}
                    >
                      {children}
                    </div>
                  )
                }}
              </For>
            </div>
          )}
        </For>
      </div>
    </div>
  )
}
