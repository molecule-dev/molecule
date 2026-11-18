/**
 * Heatmap component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
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

/** One visible cell with the tooltip text it renders. */
interface RenderedCell {
  /** The resolved cell descriptor. */
  cell: HeatmapCell
  /** Left offset inside the SVG. */
  x: number
  /** Top offset inside the SVG. */
  y: number
  /** Tooltip / aria-label text. */
  label: string
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
 * Heatmap component.
 *
 * GitHub-contributions-style activity heatmap: a year-grid (or any date range)
 * of square cells whose color encodes a per-day value. The host IS the
 * `<svg>` (`svg[mol-heatmap]`), matching React's root exactly — same
 * attributes, classes and geometry. Styling goes through `getClassMap()`; the
 * only inline styling is the per-cell `fill` attribute and the `cursor`
 * pointer a clickable cell carries. All UI text goes through the binding's
 * `useTranslation()`, so a locale switch re-renders the labels.
 */
@Component({
  selector: 'svg[mol-heatmap]',
  standalone: true,
  inputs: [
    'data',
    'range',
    'cellSize',
    'gap',
    'colorScale',
    'weekStartsOn',
    'showWeekdayLabels',
    'showMonthLabels',
    'onCellClick',
    'onCellHover',
    'tooltipFormatter',
    'ariaLabel',
    'className',
  ],
  host: {
    role: 'group',
    'data-mol-id': 'heatmap',
    '[class]': 'classes()',
    '[attr.aria-label]': 'rootLabel()',
    '[attr.width]': 'width()',
    '[attr.height]': 'height()',
    '[attr.viewBox]': 'viewBox()',
  },
  // prettier-ignore
  template: `@if (showMonthLabelsValue()) {@for (entry of visibleMonthLabels(); track entry.x) {<svg:text [attr.x]="entry.x" [attr.y]="cellSizeValue() - 1" [attr.font-size]="cellSizeValue() - 1" fill="currentColor" aria-hidden="true" [attr.data-mol-id]="'heatmap-month-' + entry.month">{{ monthLabel(entry.month) }}</svg:text>}} @if (showWeekdayLabelsValue()) {@for (row of weekdayRows(); track row.dow) {<svg:text x="0" [attr.y]="row.y" [attr.font-size]="cellSizeValue() - 1" fill="currentColor" aria-hidden="true" [attr.data-mol-id]="'heatmap-weekday-' + row.idx">{{ weekdayLabel(row.idx) }}</svg:text>}} @for (entry of visibleCells(); track entry.cell.date) {<svg:rect [attr.x]="entry.x" [attr.y]="entry.y" [attr.width]="cellSizeValue()" [attr.height]="cellSizeValue()" rx="2" ry="2" [attr.fill]="fillFor(entry.cell)" [attr.data-mol-id]="'heatmap-cell-' + entry.cell.date" [attr.data-bucket]="entry.cell.bucket" [attr.data-value]="entry.cell.value" [attr.role]="onCellClick ? 'button' : 'img'" [attr.aria-label]="entry.label" [attr.tabindex]="onCellClick ? 0 : null" [style.cursor]="onCellClick ? 'pointer' : null" (click)="clickCell(entry.cell)" (keydown)="keydownCell($event, entry.cell)" (mouseenter)="hoverCell(entry.cell)"><svg:title>{{ entry.label }}</svg:title></svg:rect>}`,
})
export class Heatmap {
  /** Sparse list of day values; missing dates render with bucket 0. */
  data: HeatmapDay[] = []
  /** Inclusive date range to render. */
  range: HeatmapProps['range'] = { start: new Date(0), end: new Date(0) }
  /** Pixel size of each cell (defaults to `11` at read time). */
  cellSize?: number
  /** Pixel gap between cells (defaults to `2` at read time). */
  gap?: number
  /** `'quantile'` (default) or an explicit ordered palette. */
  colorScale?: 'quantile' | readonly string[]
  /** First day of week — 0=Sunday, 1=Monday (defaults to `0` at read time). */
  weekStartsOn?: 0 | 1
  /** Render weekday labels in the left gutter (defaults to `false`). */
  showWeekdayLabels?: boolean
  /** Render month labels above the grid (defaults to `true`). */
  showMonthLabels?: boolean
  /** Click handler for an individual cell. */
  onCellClick?: (cell: HeatmapCell) => void
  /** Hover (mouseenter) handler for an individual cell. */
  onCellHover?: (cell: HeatmapCell) => void
  /** Builds the tooltip / aria-label string (React's default formatter otherwise). */
  tooltipFormatter?: (cell: HeatmapCell) => string
  /** Optional accessible label for the whole grid. */
  ariaLabel?: string
  /** Extra classes merged onto the SVG root. */
  className?: string

  /** The i18n service, so the labels follow a locale switch. */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   *
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the SVG's class list.
   *
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.className)
  }

  /**
   * The cell size in pixels (React's `cellSize = 11` default).
   *
   * @returns The cell size.
   */
  cellSizeValue(): number {
    return this.cellSize ?? 11
  }

  /**
   * The gap between cells in pixels (React's `gap = 2` default).
   *
   * @returns The gap.
   */
  gapValue(): number {
    return this.gap ?? 2
  }

  /**
   * The first day of the week (React's `weekStartsOn = 0` default).
   *
   * @returns 0 for Sunday, 1 for Monday.
   */
  weekStartsOnValue(): 0 | 1 {
    return this.weekStartsOn ?? 0
  }

  /**
   * Whether month labels render (React's `showMonthLabels = true` default).
   *
   * @returns Whether the month-label row renders.
   */
  showMonthLabelsValue(): boolean {
    return this.showMonthLabels ?? true
  }

  /**
   * Whether weekday labels render (React's `showWeekdayLabels = false` default).
   *
   * @returns Whether the weekday-label gutter renders.
   */
  showWeekdayLabelsValue(): boolean {
    return this.showWeekdayLabels ?? false
  }

  /**
   * The effective palette: the literal `'quantile'` builds the five-step green
   * ramp, anything else is the caller's own array.
   *
   * @returns The five palette entries, light → dark.
   */
  palette(): readonly string[] {
    const scale = this.colorScale ?? 'quantile'
    return scale === 'quantile' ? DEFAULT_PALETTE : scale
  }

  /**
   * The whole grid's geometry and cells (React's render-time computation).
   *
   * @returns The layout.
   */
  layout(): HeatmapLayout {
    const size = this.cellSizeValue()
    const gap = this.gapValue()
    const cellStep = size + gap
    const thresholds = computeQuantileThresholds(
      this.data.filter((day) => day.value > 0).map((day) => day.value),
    )

    const valueByDate = new Map<string, HeatmapDay>()
    for (const day of this.data) valueByDate.set(day.date, day)

    // Normalize range start back to Sunday/Monday (the column anchor).
    const startMs = new Date(
      this.range.start.getFullYear(),
      this.range.start.getMonth(),
      this.range.start.getDate(),
    ).getTime()
    const endMs = new Date(
      this.range.end.getFullYear(),
      this.range.end.getMonth(),
      this.range.end.getDate(),
    ).getTime()

    const startDow = new Date(startMs).getDay()
    const offsetToWeekStart = (startDow - this.weekStartsOnValue() + 7) % 7
    const gridStartMs = startMs - offsetToWeekStart * MS_PER_DAY
    const totalDays = Math.floor((endMs - gridStartMs) / MS_PER_DAY) + 1
    const totalWeeks = Math.ceil(totalDays / 7)

    const labelGutter = this.showWeekdayLabelsValue() ? size * 2 + gap : 0
    const monthHeader = this.showMonthLabelsValue() ? size + gap : 0
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
  }

  /**
   * The SVG's width (React computes it from the weeks and the gutters).
   *
   * @returns The width in pixels.
   */
  width(): number {
    return this.layout().width
  }

  /**
   * The SVG's height (React computes it from the label band and seven rows).
   *
   * @returns The height in pixels.
   */
  height(): number {
    return this.layout().height
  }

  /**
   * The SVG's `viewBox`.
   *
   * @returns The `min-x min-y width height` string.
   */
  viewBox(): string {
    const current = this.layout()
    return `0 0 ${current.width} ${current.height}`
  }

  /**
   * The visible month labels (the row is hidden when `showMonthLabels` is off).
   *
   * @returns One entry per distinct month that starts inside the range.
   */
  visibleMonthLabels(): Array<{ x: number; month: number }> {
    return this.showMonthLabelsValue() ? this.layout().monthLabels : []
  }

  /**
   * The weekday gutter rows: every other row (Mon/Wed/Fri from a Sunday
   * week), like GitHub's contribution graph.
   *
   * @returns One entry per rendered weekday label.
   */
  weekdayRows(): Array<{ dow: number; idx: number; y: number }> {
    const current = this.layout()
    return [1, 3, 5].map((dow) => ({
      dow,
      idx: (dow + this.weekStartsOnValue()) % 7,
      y: current.monthHeader + dow * current.cellStep + this.cellSizeValue() - 1,
    }))
  }

  /**
   * The visible cells with their tooltip text (React formats each in-range
   * cell once per render).
   *
   * @returns One entry per in-range day.
   */
  visibleCells(): RenderedCell[] {
    return this.layout()
      .cells.filter((entry) => entry.inRange)
      .map((entry) => ({
        cell: entry.cell,
        x: entry.x,
        y: entry.y,
        label: this.formatTooltip(entry.cell),
      }))
  }

  /**
   * The tooltip / aria-label text of one cell.
   *
   * @param cell - The cell descriptor.
   * @returns The label text.
   */
  formatTooltip(cell: HeatmapCell): string {
    if (this.tooltipFormatter) return this.tooltipFormatter(cell)
    return this.i18n.t(
      'heatmap.cell.tooltip',
      { date: cell.date, value: cell.value },
      { defaultValue: '{{date}}: {{value}}' },
    )
  }

  /**
   * The translated month label.
   *
   * @param month - Month index, January = 0.
   * @returns The label text.
   */
  monthLabel(month: number): string {
    return this.i18n.t(MONTH_KEYS[month], {}, { defaultValue: MONTH_DEFAULTS[month] })
  }

  /**
   * The translated weekday label.
   *
   * @param idx - Weekday index, Sunday = 0.
   * @returns The label text.
   */
  weekdayLabel(idx: number): string {
    return this.i18n.t(WEEKDAY_KEYS[idx], {}, { defaultValue: WEEKDAY_DEFAULTS[idx] })
  }

  /**
   * The grid's accessible name (an explicit `ariaLabel` wins).
   *
   * @returns The label text.
   */
  rootLabel(): string {
    return (
      this.ariaLabel ?? this.i18n.t('heatmap.aria.grid', {}, { defaultValue: 'Activity heatmap' })
    )
  }

  /**
   * The cell's fill (React omits the attribute for a bucket the palette lacks).
   *
   * @param cell - The cell descriptor.
   * @returns The fill color, or undefined for an unfilled bucket.
   */
  fillFor(cell: HeatmapCell): string | undefined {
    return this.palette()[cell.bucket]
  }

  /**
   * Calls `onCellClick` with the clicked cell.
   *
   * @param cell - The cell descriptor.
   */
  clickCell(cell: HeatmapCell): void {
    if (!this.onCellClick) return
    this.onCellClick(cell)
  }

  /**
   * Activates a clickable cell from the keyboard: Enter and Space both run the
   * same handler a mouse click does.
   *
   * @param event - The keydown event on the focused cell.
   * @param cell - The cell descriptor to pass to `onCellClick`.
   */
  keydownCell(event: KeyboardEvent, cell: HeatmapCell): void {
    if (!this.onCellClick) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    this.onCellClick(cell)
  }

  /**
   * Calls `onCellHover` with the hovered cell.
   *
   * @param cell - The cell descriptor.
   */
  hoverCell(cell: HeatmapCell): void {
    if (!this.onCellHover) return
    this.onCellHover(cell)
  }
}
