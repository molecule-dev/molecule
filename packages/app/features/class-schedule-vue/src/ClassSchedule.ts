/**
 * Vue weekly class-schedule grid — the counterpart of
 * `@molecule/app-class-schedule-react`'s `ClassSchedule`: the same props
 * (React names), the same DOM for the same input.
 *
 * @module
 */

import {
  defineComponent,
  h,
  type PropType,
  useId,
  type VNode,
  type VNodeArrayChildren,
  type VNodeChild,
} from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useLocale, useTranslation } from '@molecule/app-vue'

import { assignLanes, formatHourLabel } from './helpers.js'
import type { ScheduleEvent, ScheduleSlot } from './types.js'

/** Minutes in one hour. */
const MINUTES_PER_HOUR = 60

/** Weekday numbers that fall on the weekend (`0` = Sunday, `6` = Saturday). */
const WEEKEND_DAYS = new Set<number>([0, 6])

/** The ISO weekday numbers, Sunday first. */
const ALL_WEEKDAYS: Array<0 | 1 | 2 | 3 | 4 | 5 | 6> = [0, 1, 2, 3, 4, 5, 6]

/**
 * The children `h()` accepts, from a node-valued line (React's `ReactNode`):
 * a `null`/`undefined` line renders nothing but its parent element (the line
 * is only passed when the caller set it, so this is the empty fallback).
 *
 * @param value - The caller's node-valued line.
 * @returns A value `h()` accepts as children.
 */
const content = (value: VNodeChild): string | number | boolean | VNode | VNodeArrayChildren =>
  value ?? ''

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
 * @returns The schedule grid component.
 */
export const ClassSchedule = defineComponent({
  name: 'ClassSchedule',
  props: {
    events: {
      type: Array as PropType<ScheduleEvent[]>,
      required: true,
    },
    weekStartsOn: {
      type: Number as PropType<0 | 1 | 2 | 3 | 4 | 5 | 6>,
      default: 1,
    },
    dayHours: {
      type: Array as PropType<number[]>,
      default: () => [8, 18],
    },
    cellHeight: {
      type: Number,
      default: 60,
    },
    showWeekendCols: {
      type: Boolean,
      default: true,
    },
    locale: String,
    onEventClick: Function as PropType<(event: ScheduleEvent) => void>,
    onSlotClick: Function as PropType<(slot: ScheduleSlot) => void>,
    className: String,
  },
  setup(props) {
    const { t } = useTranslation()
    // Base of the day headers' ids — the columns' `aria-labelledby` names them
    // (a generated id, never one derived from data).
    const baseId = useId()
    // Read in the render (below), so the weekday headers re-word on a locale switch.
    const activeLocale = useLocale()

    /**
     * Localized short weekday name for a given ISO weekday number.
     *
     * @param fmt - The weekday formatter for this render.
     * @param weekday - ISO weekday number (0 = Sunday … 6 = Saturday).
     * @returns Localized short weekday name, e.g. `"Mon"`.
     */
    const weekdayLabel = (fmt: Intl.DateTimeFormat, weekday: number): string =>
      // 1970-01-04 = Sunday → add `weekday` days to get the right name.
      fmt.format(new Date(Date.UTC(1970, 0, 4 + weekday)))

    return (): VNode => {
      const cm = getClassMap()

      const [startHour, endHour] = props.dayHours
      const safeStart = Math.max(0, Math.min(23, Math.floor(startHour)))
      const safeEnd = Math.max(safeStart + 1, Math.min(24, Math.floor(endHour)))
      const startMinutes = safeStart * MINUTES_PER_HOUR
      const endMinutes = safeEnd * MINUTES_PER_HOUR
      const totalMinutes = endMinutes - startMinutes
      const hourCount = safeEnd - safeStart

      // Column ordering: rotate weekdays so `weekStartsOn` is first.
      const weekStartsOn = props.weekStartsOn
      const rotated = [
        ...ALL_WEEKDAYS.slice(weekStartsOn),
        ...ALL_WEEKDAYS.slice(0, weekStartsOn),
      ] as Array<0 | 1 | 2 | 3 | 4 | 5 | 6>
      const visibleWeekdays = props.showWeekendCols
        ? rotated
        : rotated.filter((d) => !WEEKEND_DAYS.has(d))

      // Localized weekday header — locale data, not phrases, so it is Intl
      // output in the app's active locale (an explicit `locale` prop still
      // wins), and it follows a locale switch.
      const weekdayFmt = new Intl.DateTimeFormat(props.locale ?? activeLocale.value, {
        weekday: 'short',
      })

      // Group events by weekday + run lane assignment per day.
      const eventsByDay = new Map<number, ScheduleEvent[]>()
      for (const event of props.events) {
        if (!visibleWeekdays.includes(event.weekday)) continue
        const list = eventsByDay.get(event.weekday) ?? []
        list.push(event)
        eventsByDay.set(event.weekday, list)
      }

      const totalHeightPx = hourCount * props.cellHeight

      const headers: VNode[] = visibleWeekdays.map((weekday) =>
        h(
          'div',
          {
            key: `head-${weekday}`,
            id: `${baseId}-day-${weekday}`,
            'data-mol-id': 'class-schedule-day-header',
            'data-weekday': weekday,
            class: cm.cn(
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              cm.textCenter,
              cm.sp('p', 2),
            ),
          },
          weekdayLabel(weekdayFmt, weekday),
        ),
      )

      const hourLabels: VNode[] = Array.from({ length: hourCount }).map((_, i) => {
        const hourMinutes = startMinutes + i * MINUTES_PER_HOUR
        return h(
          'div',
          {
            key: `hour-${i}`,
            'data-mol-id': 'class-schedule-hour-label',
            class: cm.cn(cm.textSize('xs'), cm.sp('px', 2)),
            style: {
              position: 'absolute',
              top: `${i * props.cellHeight}px`,
              height: `${props.cellHeight}px`,
              right: '0px',
              left: '0px',
              textAlign: 'right',
            },
          },
          formatHourLabel(hourMinutes),
        )
      })

      const timeAxis = h(
        'div',
        {
          'data-mol-id': 'class-schedule-time-axis',
          class: cm.cn(cm.position('relative')),
          style: { height: `${totalHeightPx}px` },
        },
        hourLabels,
      )

      const dayColumns: VNode[] = visibleWeekdays.map((weekday) => {
        const dayEvents = eventsByDay.get(weekday) ?? []
        const laned = assignLanes(dayEvents)

        // Empty-slot click targets — one button per hour row, only while
        // `onSlotClick` is set: a focusable button that does nothing would be
        // a keyboard trap.
        const slots: VNode[] = props.onSlotClick
          ? Array.from({ length: hourCount }).map((_, i) => {
              const slotStart = startMinutes + i * MINUTES_PER_HOUR
              return h('button', {
                key: `slot-${weekday}-${i}`,
                type: 'button',
                'data-mol-id': 'class-schedule-slot',
                'data-weekday': weekday,
                'data-start': slotStart,
                'aria-label': t(
                  'classSchedule.aria.slot',
                  { weekday: weekdayLabel(weekdayFmt, weekday), time: formatHourLabel(slotStart) },
                  { defaultValue: 'Empty slot, {{weekday}} {{time}}' },
                ),
                onClick: () => props.onSlotClick?.({ weekday, start: slotStart }),
                /* mol-bespoke-button: an INVISIBLE hour-slot hit target,
                   absolutely positioned over the grid — it has no label,
                   no surface and no chrome, so the inline
                   background/border/padding are native resets. A
                   `cm.button()` fill would paint the empty grid. */
                style: {
                  position: 'absolute',
                  top: `${i * props.cellHeight}px`,
                  left: '0px',
                  right: '0px',
                  height: `${props.cellHeight}px`,
                  background: 'transparent',
                  border: '0px',
                  padding: '0px',
                  cursor: 'pointer',
                },
              })
            })
          : []

        // Event tiles.
        const tiles: VNode[] = laned.flatMap(({ event, lane, lanes }) => {
          const eventStart = Math.max(event.start, startMinutes)
          const eventEnd = Math.min(event.end, endMinutes)
          if (eventEnd <= eventStart) return []
          const topPx = ((eventStart - startMinutes) / totalMinutes) * totalHeightPx
          const heightPx = ((eventEnd - eventStart) / totalMinutes) * totalHeightPx
          const leftPct = (lane / lanes) * 100
          const widthPct = (1 / lanes) * 100

          const lines: VNode[] = [
            h('span', { 'data-mol-id': 'class-schedule-event-title' }, content(event.title)),
          ]
          if (event.subtitle) {
            lines.push(
              h(
                'span',
                {
                  'data-mol-id': 'class-schedule-event-subtitle',
                  class: cm.cn(cm.textSize('xs'), cm.fontWeight('normal')),
                },
                content(event.subtitle),
              ),
            )
          }
          if (event.meta) {
            lines.push(
              h(
                'span',
                {
                  'data-mol-id': 'class-schedule-event-meta',
                  class: event.accentColor
                    ? cm.accentCardLabel({ tone: 'custom' })
                    : cm.cn(cm.textSize('xs'), cm.fontWeight('normal')),
                },
                content(event.meta),
              ),
            )
          }
          // The tile's accessible name is its content — title, subtitle, meta,
          // then the time, through a visually hidden run (the former
          // `aria-label` REPLACED that content as the name, so a screen reader
          // never heard the class).
          lines.push(
            h(
              'span',
              { class: cm.srOnly },
              t(
                'classSchedule.aria.event',
                {
                  weekday: weekdayLabel(weekdayFmt, weekday),
                  start: formatHourLabel(event.start),
                  end: formatHourLabel(event.end),
                },
                { defaultValue: '{{weekday}} {{start}} – {{end}}' },
              ),
            ),
          )

          /* mol-bespoke-button: a calendar EVENT TILE, not a CTA —
             it is absolutely positioned and sized from the event's
             start/end times and lane, and its accent bar carries
             the caller's own `accentColor` (data, not a design
             token). No `cm.button()` tier can express either. */
          // A `<button>` only while `onEventClick` is set: without a handler
          // the tile is static content — a focusable button that does nothing
          // would be a keyboard trap.
          const tileProps = {
            key: event.id,
            'data-mol-id': 'class-schedule-event',
            'data-event-id': event.id,
            class: cm.cn(
              cm.flex({ direction: 'col', align: 'start' }),
              cm.sp('p', 1),
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
              // The caller's accentColor drives an inset bar (DESIGN.md →
              // "Accent bars"), not a hard border-left.
              event.accentColor && cm.accentCard({ tone: 'custom' }),
            ),
            style: {
              position: 'absolute',
              top: `${topPx}px`,
              height: `${heightPx}px`,
              left: `calc(${leftPct}% + 2px)`,
              width: `calc(${widthPct}% - 4px)`,
              overflow: 'hidden',
              textAlign: 'left',
              cursor: props.onEventClick ? 'pointer' : 'default',
              ...(event.accentColor ? { '--mol-accent': event.accentColor } : {}),
            },
          }
          return [
            props.onEventClick
              ? h(
                  'button',
                  { ...tileProps, type: 'button', onClick: () => props.onEventClick?.(event) },
                  lines,
                )
              : h('div', tileProps, lines),
          ]
        })

        return h(
          'div',
          {
            key: `col-${weekday}`,
            role: 'group',
            'aria-labelledby': `${baseId}-day-${weekday}`,
            'data-mol-id': 'class-schedule-day-column',
            'data-weekday': weekday,
            class: cm.cn(cm.position('relative')),
            style: { height: `${totalHeightPx}px` },
          },
          [...slots, ...tiles],
        )
      })

      // A named `group`, not a `grid`: the layout is a CSS grid, not an ARIA
      // grid — it has no rows and no grid keyboard model, and `role="grid"`
      // would promise one (axe: aria-required-children).
      return h(
        'div',
        {
          class: cm.cn(props.className),
          'data-mol-id': 'class-schedule',
          role: 'group',
          'aria-label': t(
            'classSchedule.aria.region',
            {},
            {
              defaultValue: 'Weekly class schedule',
            },
          ),
        },
        [
          h(
            'div',
            {
              class: cm.cn(cm.grid({ cols: visibleWeekdays.length + 1, gap: 'none' })),
              style: {
                gridTemplateColumns: `auto repeat(${visibleWeekdays.length}, minmax(0, 1fr))`,
              },
            },
            [
              // Header row.
              h('div', {
                class: cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.sp('p', 2)),
                'aria-hidden': 'true',
              }),
              ...headers,
              timeAxis,
              ...dayColumns,
            ],
          ),
        ],
      )
    }
  },
})
