import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/** A single data point: a date (`yyyy-mm-dd` ISO string) and a numeric value. */
export interface HeatmapDay {
  /** ISO date string `yyyy-mm-dd`. */
  date: string
  /** Numeric value driving the cell's color bucket. */
  value: number
  /** Optional payload echoed back through `onCellClick` / `onCellHover`. */
  payload?: unknown
}

/** Resolved cell descriptor passed to interaction callbacks. */
export interface HeatmapCell {
  /** ISO date string `yyyy-mm-dd`. */
  date: string
  /** Cell value (0 if no data for that date). */
  value: number
  /** Quantile bucket index (0..colors.length-1). */
  bucket: number
  /** Original payload from the matching `HeatmapDay`, if any. */
  payload?: unknown
}

/** Heatmap component props. */
export interface HeatmapProps {
  /** Sparse list of day values; missing dates render with bucket 0. */
  data: HeatmapDay[]
  /** Inclusive date range to render. */
  range: { start: Date; end: Date }
  /** Pixel size of each cell. Defaults to 11. */
  cellSize?: number
  /** Pixel gap between cells. Defaults to 2. */
  gap?: number
  /**
   * Either an explicit ordered palette (5 hex/rgb colors light → dark) or the
   * literal `'quantile'` (default) which builds a 5-step quantile palette
   * of the value distribution using a green ramp.
   */
  colorScale?: 'quantile' | readonly string[]
  /** First day of week — 0=Sunday, 1=Monday. Defaults to 0. */
  weekStartsOn?: 0 | 1
  /** Render weekday labels in the left gutter. Defaults to false. */
  showWeekdayLabels?: boolean
  /** Render month labels above the grid. Defaults to true. */
  showMonthLabels?: boolean
  /** Click handler for an individual cell. */
  onCellClick?: (cell: HeatmapCell) => void
  /** Hover (mouseenter) handler for an individual cell. */
  onCellHover?: (cell: HeatmapCell) => void
  /** Build the tooltip / aria-label string. Defaults to `"<date>: <value>"`. */
  tooltipFormatter?: (cell: HeatmapCell) => string
  /** Optional accessible label for the whole grid. */
  ariaLabel?: string
  /** Extra classes merged onto the SVG root. */
  className?: string
}

const DEFAULT_PALETTE = [
  'rgba(0,0,0,0.06)',
  'rgba(34,197,94,0.25)',
  'rgba(34,197,94,0.45)',
  'rgba(34,197,94,0.7)',
  'rgba(34,197,94,1)',
] as const

const MS_PER_DAY = 86_400_000

/**
 * Format a `Date` as a `yyyy-mm-dd` ISO date string in local time.
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
 * @param values - All non-zero values from the data set.
 * @returns Four ascending thresholds.
 */
export function computeQuantileThresholds(values: number[]): [number, number, number, number] {
  if (values.length === 0) return [1, 1, 1, 1]
  const sorted = [...values].sort((a, b) => a - b)
  const q = (p: number): number => {
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * sorted.length)))
    return sorted[idx]
  }
  return [q(0.2), q(0.4), q(0.6), q(0.8)]
}

/**
 * Bucket a numeric value into a 0..4 index given quantile thresholds.
 * Bucket 0 always represents zero / no activity.
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

/**
 * GitHub-contributions-style activity heatmap. Renders a year-grid (or any
 * date range) of square cells whose color encodes a per-day value. Used for
 * habit consistency, language-learning XP, attendance, review-by-day stats,
 * and any other "activity-by-day" visualization.
 *
 * Styling goes through `@molecule/app-ui`'s `getClassMap()`; the only inline
 * styling is the SVG `fill` attribute on each cell (a real SVG attribute,
 * not a Tailwind class).
 * @param root0 - Component props.
 * @param root0.data - Day-keyed value list.
 * @param root0.range - Inclusive date range.
 * @param root0.cellSize - Pixel size of each cell.
 * @param root0.gap - Pixel gap between cells.
 * @param root0.colorScale - Palette or `'quantile'`.
 * @param root0.weekStartsOn - First day of week (0=Sun, 1=Mon).
 * @param root0.showWeekdayLabels - Render weekday gutter labels.
 * @param root0.showMonthLabels - Render month header labels.
 * @param root0.onCellClick - Cell click handler.
 * @param root0.onCellHover - Cell hover handler.
 * @param root0.tooltipFormatter - Build tooltip / aria-label string.
 * @param root0.ariaLabel - Accessible label for the SVG.
 * @param root0.className - Extra classes merged onto the SVG root.
 * @returns The heatmap SVG element.
 */
export function Heatmap({
  data,
  range,
  cellSize = 11,
  gap = 2,
  colorScale = 'quantile',
  weekStartsOn = 0,
  showWeekdayLabels = false,
  showMonthLabels = true,
  onCellClick,
  onCellHover,
  tooltipFormatter,
  ariaLabel,
  className,
}: HeatmapProps) {
  const cm = getClassMap()
  const { t } = useTranslation()

  const palette = colorScale === 'quantile' ? DEFAULT_PALETTE : colorScale
  const thresholds = computeQuantileThresholds(data.filter((d) => d.value > 0).map((d) => d.value))

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
  const offsetToWeekStart = (startDow - weekStartsOn + 7) % 7
  const gridStartMs = startMs - offsetToWeekStart * MS_PER_DAY
  const totalDays = Math.floor((endMs - gridStartMs) / MS_PER_DAY) + 1
  const totalWeeks = Math.ceil(totalDays / 7)

  const cellStep = cellSize + gap
  const labelGutter = showWeekdayLabels ? cellSize * 2 + gap : 0
  const monthHeader = showMonthLabels ? cellSize + gap : 0
  const width = labelGutter + totalWeeks * cellStep
  const height = monthHeader + 7 * cellStep

  // Build cells.
  const cells: Array<{
    cell: HeatmapCell
    x: number
    y: number
    inRange: boolean
  }> = []
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

  const monthKeys = [
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
  const monthDefaults = [
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

  const weekdayKeysSun = [
    'heatmap.weekday.sun',
    'heatmap.weekday.mon',
    'heatmap.weekday.tue',
    'heatmap.weekday.wed',
    'heatmap.weekday.thu',
    'heatmap.weekday.fri',
    'heatmap.weekday.sat',
  ] as const
  const weekdayDefaultsSun = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

  const formatTooltip = (cell: HeatmapCell): string => {
    if (tooltipFormatter) return tooltipFormatter(cell)
    return t(
      'heatmap.cell.tooltip',
      { date: cell.date, value: cell.value },
      { defaultValue: '{{date}}: {{value}}' },
    )
  }

  const rootLabel = ariaLabel ?? t('heatmap.aria.grid', {}, { defaultValue: 'Activity heatmap' })

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={rootLabel}
      data-mol-id="heatmap"
      className={cm.cn(className)}
    >
      {showMonthLabels &&
        monthLabels.map(({ x, month }) => (
          <text
            key={`month-${month}-${x}`}
            x={x}
            y={cellSize - 1}
            fontSize={cellSize - 1}
            fill="currentColor"
            data-mol-id={`heatmap-month-${month}`}
          >
            {t(monthKeys[month], {}, { defaultValue: monthDefaults[month] })}
          </text>
        ))}
      {showWeekdayLabels &&
        Array.from({ length: 7 }, (_, dow) => {
          const idx = (dow + weekStartsOn) % 7
          // Show every other weekday (mon/wed/fri pattern) like GitHub.
          if (dow % 2 === 0) return null
          return (
            <text
              key={`wd-${dow}`}
              x={0}
              y={monthHeader + dow * cellStep + cellSize - 1}
              fontSize={cellSize - 1}
              fill="currentColor"
              data-mol-id={`heatmap-weekday-${idx}`}
            >
              {t(weekdayKeysSun[idx], {}, { defaultValue: weekdayDefaultsSun[idx] })}
            </text>
          )
        })}
      {cells.map(({ cell, x, y, inRange }) => {
        if (!inRange) return null
        const label = formatTooltip(cell)
        return (
          <rect
            key={cell.date}
            x={x}
            y={y}
            width={cellSize}
            height={cellSize}
            rx={2}
            ry={2}
            fill={palette[cell.bucket]}
            data-mol-id={`heatmap-cell-${cell.date}`}
            data-bucket={cell.bucket}
            data-value={cell.value}
            aria-label={label}
            tabIndex={onCellClick ? 0 : -1}
            onClick={onCellClick ? () => onCellClick(cell) : undefined}
            onMouseEnter={onCellHover ? () => onCellHover(cell) : undefined}
            style={{ cursor: onCellClick ? 'pointer' : undefined }}
          >
            <title>{label}</title>
          </rect>
        )
      })}
    </svg>
  )
}
