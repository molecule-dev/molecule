/**
 * Solid GitHub-contributions-style year-grid activity heatmap.
 *
 * Solid counterpart of `@molecule/app-heatmap-react`'s `Heatmap` — the same
 * props (React names), the same ClassMap classes, the same inline style and
 * SVG geometry, and therefore the same DOM for the same input.
 *
 * @module
 */

import { type Component, createMemo, For, type JSX, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

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

/** The whole grid's geometry, labels and cells. */
interface HeatmapLayout {
  /** SVG width in pixels. */
  width: number
  /** SVG height in pixels. */
  height: number
  /** Distance between two cells (size + gap). */
  cellStep: number
  /** Height of the month-label band. */
  monthHeader: number
  /** One entry per distinct month that starts inside the range. */
  monthLabels: Array<{ x: number; month: number }>
  /** Every cell of the (week-aligned) grid. */
  cells: PositionedCell[]
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
 * @returns The rendered heatmap.
 */
export const Heatmap: Component<HeatmapProps> = (props: HeatmapProps): JSX.Element => {
  const cm = getClassMap()
  const { t } = useTranslation()

  const cellSize = (): number => props.cellSize ?? 11
  const gap = (): number => props.gap ?? 2
  const weekStartsOn = (): 0 | 1 => props.weekStartsOn ?? 0
  const showMonthLabels = (): boolean => props.showMonthLabels ?? true
  const showWeekdayLabels = (): boolean => props.showWeekdayLabels ?? false

  /**
   * The effective palette: the literal `'quantile'` (React's default) builds
   * the five-step green ramp, anything else is the caller's own array.
   *
   * @returns The five palette entries, light → dark.
   */
  const palette = (): readonly string[] => {
    const scale = props.colorScale ?? 'quantile'
    return scale === 'quantile' ? DEFAULT_PALETTE : scale
  }

  const layout = createMemo((): HeatmapLayout => {
    const data = props.data
    const range = props.range
    const size = cellSize()
    const gapValue = gap()
    const cellStep = size + gapValue
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
    const offsetToWeekStart = (startDow - weekStartsOn() + 7) % 7
    const gridStartMs = startMs - offsetToWeekStart * MS_PER_DAY
    const totalDays = Math.floor((endMs - gridStartMs) / MS_PER_DAY) + 1
    const totalWeeks = Math.ceil(totalDays / 7)

    const labelGutter = showWeekdayLabels() ? size * 2 + gapValue : 0
    const monthHeader = showMonthLabels() ? size + gapValue : 0
    const width = labelGutter + totalWeeks * cellStep
    const height = monthHeader + 7 * cellStep

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

    return { width, height, cellStep, monthHeader, monthLabels, cells }
  })

  const visibleCells = (): PositionedCell[] => layout().cells.filter((entry) => entry.inRange)

  /**
   * The weekday gutter rows: every other row (Mon/Wed/Fri from a Sunday
   * week), like GitHub's contribution graph.
   *
   * @returns One entry per rendered weekday label.
   */
  const weekdayRows = (): Array<{ dow: number; idx: number; y: number }> => {
    const current = layout()
    return [1, 3, 5].map((dow) => ({
      dow,
      idx: (dow + weekStartsOn()) % 7,
      y: current.monthHeader + dow * current.cellStep + cellSize() - 1,
    }))
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

  const rootLabel = (): string =>
    props.ariaLabel ?? t('heatmap.aria.grid', {}, { defaultValue: 'Activity heatmap' })

  /**
   * Activate a clickable cell from the keyboard: Enter and Space both run the
   * same handler a mouse click does.
   *
   * @param event - The keydown event on the focused cell.
   * @param cell - The cell descriptor to pass to `onCellClick`.
   */
  const handleCellKeyDown = (event: KeyboardEvent, cell: HeatmapCell): void => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    props.onCellClick?.(cell)
  }

  return (
    <svg
      width={layout().width}
      height={layout().height}
      viewBox={`0 0 ${layout().width} ${layout().height}`}
      role="group"
      aria-label={rootLabel()}
      data-mol-id="heatmap"
      class={cm.cn(props.className)}
    >
      <Show when={showMonthLabels()}>
        <For each={layout().monthLabels}>
          {(entry) => (
            <text
              x={entry.x}
              y={cellSize() - 1}
              font-size={String(cellSize() - 1)}
              fill="currentColor"
              aria-hidden="true"
              data-mol-id={`heatmap-month-${entry.month}`}
            >
              {t(MONTH_KEYS[entry.month], {}, { defaultValue: MONTH_DEFAULTS[entry.month] })}
            </text>
          )}
        </For>
      </Show>
      <Show when={showWeekdayLabels()}>
        <For each={weekdayRows()}>
          {(row) => (
            <text
              x={0}
              y={row.y}
              font-size={String(cellSize() - 1)}
              fill="currentColor"
              aria-hidden="true"
              data-mol-id={`heatmap-weekday-${row.idx}`}
            >
              {t(WEEKDAY_KEYS[row.idx], {}, { defaultValue: WEEKDAY_DEFAULTS[row.idx] })}
            </text>
          )}
        </For>
      </Show>
      <For each={visibleCells()}>
        {(entry) => {
          // React formats each visible cell's label once per render; the memo
          // keeps that count and still re-reads the translation on a locale switch.
          const label = createMemo(() => formatTooltip(entry.cell))
          return (
            <rect
              x={entry.x}
              y={entry.y}
              width={cellSize()}
              height={cellSize()}
              rx={2}
              ry={2}
              fill={palette()[entry.cell.bucket]}
              data-mol-id={`heatmap-cell-${entry.cell.date}`}
              data-bucket={entry.cell.bucket}
              data-value={entry.cell.value}
              role={props.onCellClick ? 'button' : 'img'}
              aria-label={label()}
              tabindex={props.onCellClick ? 0 : undefined}
              onClick={props.onCellClick ? (): void => props.onCellClick?.(entry.cell) : undefined}
              onKeyDown={
                props.onCellClick
                  ? (event): void => handleCellKeyDown(event, entry.cell)
                  : undefined
              }
              onMouseEnter={
                props.onCellHover ? (): void => props.onCellHover?.(entry.cell) : undefined
              }
              style={props.onCellClick ? { cursor: 'pointer' } : undefined}
            >
              <title>{label()}</title>
            </rect>
          )
        }}
      </For>
    </svg>
  )
}
