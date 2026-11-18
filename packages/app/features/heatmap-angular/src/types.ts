/**
 * Types of `@molecule/app-heatmap-angular` — the Angular counterpart of
 * `@molecule/app-heatmap-react`, same props and DOM.
 *
 * @module
 */

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
