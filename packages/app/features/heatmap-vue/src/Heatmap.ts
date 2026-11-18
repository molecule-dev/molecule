/**
 * Vue GitHub-contributions-style year-grid activity heatmap.
 *
 * Vue counterpart of `@molecule/app-heatmap-react`'s `Heatmap` — the same
 * props (React names), the same ClassMap classes, the same inline style and
 * SVG geometry, and therefore the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import type { HeatmapCell, HeatmapDay, HeatmapProps } from './types.js'

/** The default five-step quantile palette (light → dark). */
const DEFAULT_PALETTE = [
  'rgba(0,0,0,0.06)',
  'rgba(34,197,94,0.25)',
  'rgba(34,197,94,0.45)',
  'rgba(34,197,94,0.7)',
  'rgba(34,197,94,1)',
] as const

/** Milliseconds in one day. */
const MS_PER_DAY = 86_400_000

/** Translation keys of the month labels, January first. */
const MONTH_KEYS = [
  'heatmap.month.jan',
  'heatmap.month.feb',
  'heatmap.month.mar',
  'heatmap.month.apr',
  'heatmap.month.may',
  'heatmap.month.jun',
  'heatmap.month.jul',
  'heatmap.month.aug',
  'heatmap.month.sep',
  'heatmap.month.oct',
  'heatmap.month.nov',
  'heatmap.month.dec',
] as const

/** English fallbacks of the month labels, January first. */
const MONTH_DEFAULTS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

/** Translation keys of the weekday labels, Sunday first. */
const WEEKDAY_KEYS = [
  'heatmap.weekday.sun',
  'heatmap.weekday.mon',
  'heatmap.weekday.tue',
  'heatmap.weekday.wed',
  'heatmap.weekday.thu',
  'heatmap.weekday.fri',
  'heatmap.weekday.sat',
] as const

/** English fallbacks of the weekday labels, Sunday first. */
const WEEKDAY_DEFAULTS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

/**
 * Format a `Date` as a `yyyy-mm-dd` ISO date string in local time.
 *
 * @param d - Date to format.
 * @returns ISO date string.
 */
function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Compute four quantile thresholds from a numeric distribution.
 * Returns thresholds that split values into 5 ascending buckets.
 *
 * @param values - All non-zero values from the data set.
 * @returns Four ascending thresholds.
 */
export function computeQuantileThresholds(values: number[]): [number, number, number, number] {
  if (values.length === 0) return [1, 1, 1, 1]
  const sorted = [...values].sort((a, b) => a - b)
  const q = (p: number): number => {
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * sorted.length)))
    return sorted[idx] as number
  }
  return [q(0.2), q(0.4), q(0.6), q(0.8)]
}

/**
 * Bucket a numeric value into a 0..4 index given quantile thresholds.
 * Bucket 0 always represents zero / no activity.
 *
 * @param value - Value to bucket.
 * @param thresholds - Four ascending quantile thresholds.
 * @returns Integer in `[0, 4]`.
 */
export function bucketValue(
  value: number,
  thresholds: readonly [number, number, number, number],
): number {
  if (value <= 0) return 0
  if (value <= thresholds[0]) return 1
  if (value <= thresholds[1]) return 2
  if (value <= thresholds[2]) return 3
  return 4
}

/** One grid cell with its geometry and whether it falls inside the range. */
interface PositionedCell {
  /** The resolved cell descriptor. */
  cell: HeatmapCell
  /** Left offset inside the SVG. */
  x: number
  /** Top offset inside the SVG. */
  y: number
  /** Whether the date is inside the requested range. */
  inRange: boolean
}

/**
 * GitHub-contributions-style activity heatmap. Renders a year-grid (or any
 * date range) of square cells whose color encodes a per-day value. Used for
 * habit consistency, language-learning XP, attendance, review-by-day stats,
 * and any other "activity-by-day" visualization.
 *
 * Styling goes through `@molecule/app-ui`'s `getClassMap()`; the only inline
 * styling is the SVG `fill` attribute on each cell (a real SVG attribute,
 * not a Tailwind class) and the `cursor` pointer a clickable cell carries.
 *
 * @param props - Component props (see {@link HeatmapProps}).
 * @returns The heatmap component.
 */
export const Heatmap = defineComponent({
  name: 'Heatmap',
  props: {
    data: {
      type: Array as PropType<HeatmapDay[]>,
      required: true,
    },
    range: {
      type: Object as PropType<HeatmapProps['range']>,
      required: true,
    },
    cellSize: {
      type: Number,
      default: 11,
    },
    gap: {
      type: Number,
      default: 2,
    },
    colorScale: {
      type: [String, Array] as PropType<'quantile' | readonly string[]>,
      default: 'quantile',
    },
    weekStartsOn: {
      type: Number as PropType<0 | 1>,
      default: 0,
    },
    showWeekdayLabels: {
      type: Boolean,
      default: false,
    },
    showMonthLabels: {
      type: Boolean,
      default: true,
    },
    // Callback and formatter props: plain functions, no validation.
    onCellClick: {
      type: Function as PropType<(cell: HeatmapCell) => void>,
      default: undefined,
    },
    onCellHover: {
      type: Function as PropType<(cell: HeatmapCell) => void>,
      default: undefined,
    },
    tooltipFormatter: {
      type: Function as PropType<(cell: HeatmapCell) => string>,
      default: undefined,
    },
    ariaLabel: String,
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    return (): VNode => {
      const { data, range, cellSize, gap } = props
      const palette = props.colorScale === 'quantile' ? DEFAULT_PALETTE : props.colorScale
      const thresholds = computeQuantileThresholds(
        data.filter((day) => day.value > 0).map((day) => day.value),
      )

      const valueByDate = new Map<string, HeatmapDay>()
      for (const day of data) valueByDate.set(day.date, day)

      // Normalize range start back to Sunday/Monday (the column anchor).
      const startMs = new Date(
        range.start.getFullYear(),
        range.start.getMonth(),
        range.start.getDate(),
      ).getTime()
      const endMs = new Date(
        range.end.getFullYear(),
        range.end.getMonth(),
        range.end.getDate(),
      ).getTime()

      const startDow = new Date(startMs).getDay()
      const offsetToWeekStart = (startDow - props.weekStartsOn + 7) % 7
      const gridStartMs = startMs - offsetToWeekStart * MS_PER_DAY
      const totalDays = Math.floor((endMs - gridStartMs) / MS_PER_DAY) + 1
      const totalWeeks = Math.ceil(totalDays / 7)

      const cellStep = cellSize + gap
      const labelGutter = props.showWeekdayLabels ? cellSize * 2 + gap : 0
      const monthHeader = props.showMonthLabels ? cellSize + gap : 0
      const width = labelGutter + totalWeeks * cellStep
      const height = monthHeader + 7 * cellStep

      // Build cells and month labels.
      const cells: PositionedCell[] = []
      const monthLabels: Array<{ x: number; month: number }> = []
      let lastMonth = -1

      for (let i = 0; i < totalDays; i++) {
        const week = Math.floor(i / 7)
        const dow = i % 7
        const dayMs = gridStartMs + i * MS_PER_DAY
        const date = new Date(dayMs)
        const inRange = dayMs >= startMs && dayMs <= endMs
        const iso = isoDate(date)
        const day = valueByDate.get(iso)
        const value = day?.value ?? 0
        const bucket = bucketValue(value, thresholds)
        const cell: HeatmapCell = {
          date: iso,
          value,
          bucket,
          payload: day?.payload,
        }
        cells.push({
          cell,
          x: labelGutter + week * cellStep,
          y: monthHeader + dow * cellStep,
          inRange,
        })
        if (inRange && dow === 0) {
          const m = date.getMonth()
          if (m !== lastMonth) {
            monthLabels.push({ x: labelGutter + week * cellStep, month: m })
            lastMonth = m
          }
        }
      }

      /**
       * The tooltip / aria-label text of one cell.
       *
       * @param cell - The cell descriptor.
       * @returns The label text.
       */
      const formatTooltip = (cell: HeatmapCell): string => {
        if (props.tooltipFormatter) return props.tooltipFormatter(cell)
        return t(
          'heatmap.cell.tooltip',
          { date: cell.date, value: cell.value },
          { defaultValue: '{{date}}: {{value}}' },
        )
      }

      const rootLabel =
        props.ariaLabel ?? t('heatmap.aria.grid', {}, { defaultValue: 'Activity heatmap' })

      /**
       * Activate a clickable cell from the keyboard: Enter and Space both run
       * the same handler a mouse click does.
       *
       * @param event - The keydown event on the focused cell.
       * @param cell - The cell descriptor to pass to `onCellClick`.
       */
      const handleCellKeyDown = (event: KeyboardEvent, cell: HeatmapCell): void => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        props.onCellClick?.(cell)
      }

      const children: VNodeChild[] = []

      if (props.showMonthLabels) {
        for (const { x, month } of monthLabels) {
          children.push(
            h(
              'text',
              {
                key: `month-${month}-${x}`,
                x,
                y: cellSize - 1,
                'font-size': cellSize - 1,
                fill: 'currentColor',
                'aria-hidden': 'true',
                'data-mol-id': `heatmap-month-${month}`,
              },
              t(MONTH_KEYS[month], {}, { defaultValue: MONTH_DEFAULTS[month] }),
            ),
          )
        }
      }

      if (props.showWeekdayLabels) {
        for (let dow = 0; dow < 7; dow++) {
          // Show every other weekday (mon/wed/fri pattern) like GitHub.
          if (dow % 2 === 0) continue
          const idx = (dow + props.weekStartsOn) % 7
          children.push(
            h(
              'text',
              {
                key: `wd-${dow}`,
                x: 0,
                y: monthHeader + dow * cellStep + cellSize - 1,
                'font-size': cellSize - 1,
                fill: 'currentColor',
                'aria-hidden': 'true',
                'data-mol-id': `heatmap-weekday-${idx}`,
              },
              t(WEEKDAY_KEYS[idx], {}, { defaultValue: WEEKDAY_DEFAULTS[idx] }),
            ),
          )
        }
      }

      for (const { cell, x, y, inRange } of cells) {
        if (!inRange) continue
        const label = formatTooltip(cell)
        const attrs: Record<string, unknown> = {
          key: cell.date,
          x,
          y,
          width: cellSize,
          height: cellSize,
          rx: 2,
          ry: 2,
          fill: palette[cell.bucket],
          'data-mol-id': `heatmap-cell-${cell.date}`,
          'data-bucket': cell.bucket,
          'data-value': cell.value,
          role: props.onCellClick ? 'button' : 'img',
          'aria-label': label,
        }
        if (props.onCellClick) {
          attrs.tabindex = 0
          attrs.onClick = (): void => props.onCellClick?.(cell)
          attrs.onKeydown = (event: KeyboardEvent): void => handleCellKeyDown(event, cell)
          attrs.style = { cursor: 'pointer' }
        }
        if (props.onCellHover) {
          attrs.onMouseenter = (): void => props.onCellHover?.(cell)
        }
        children.push(h('rect', attrs, [h('title', label)]))
      }

      return h(
        'svg',
        {
          width,
          height,
          viewBox: `0 0 ${width} ${height}`,
          role: 'group',
          'aria-label': rootLabel,
          'data-mol-id': 'heatmap',
          class: cm.cn(props.className),
        },
        children,
      )
    }
  },
})
