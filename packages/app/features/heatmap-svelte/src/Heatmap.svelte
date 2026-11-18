<!--
  Heatmap: the Svelte counterpart of `@molecule/app-heatmap-react`'s
  `Heatmap` — GitHub-contributions-style year-grid activity heatmap. Same props
  (React names), same ClassMap classes, same inline style and SVG geometry, and
  therefore the same DOM for the same input.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { HeatmapCell, HeatmapDay, HeatmapProps } from './types.js'
  import { bucketValue, computeQuantileThresholds } from './utilities.js'

  let {
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
  }: HeatmapProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

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

  /** One visible cell with its geometry and tooltip text. */
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

  /** The palette the cells fill from. */
  const palette = $derived(colorScale === 'quantile' ? DEFAULT_PALETTE : colorScale)

  /**
   * The tooltip / aria-label text of one cell.
   *
   * @param cell - The cell descriptor.
   * @returns The label text.
   */
  function formatTooltip(cell: HeatmapCell): string {
    if (tooltipFormatter) return tooltipFormatter(cell)
    return t(
      'heatmap.cell.tooltip',
      { date: cell.date, value: cell.value },
      { defaultValue: '{{date}}: {{value}}' },
    )
  }

  /** The whole grid: size, label rows and the visible cells. */
  const layout = $derived.by(() => {
    const thresholds = computeQuantileThresholds(
      data.filter((day) => day.value > 0).map((day) => day.value),
    )

    // Sparse days, keyed by their ISO date (the only keys looked up below).
    const valueByDate: Record<string, HeatmapDay | undefined> = {}
    for (const day of data) valueByDate[day.date] = day

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

    const cells: RenderedCell[] = []
    const monthLabels: Array<{ x: number; month: number }> = []
    let lastMonth = -1

    for (let i = 0; i < totalDays; i++) {
      const week = Math.floor(i / 7)
      const dow = i % 7
      const dayMs = gridStartMs + i * MS_PER_DAY
      const date = new Date(dayMs)
      const inRange = dayMs >= startMs && dayMs <= endMs
      const iso = isoDate(date)
      const day = valueByDate[iso]
      const value = day?.value ?? 0
      const bucket = bucketValue(value, thresholds)
      const cell: HeatmapCell = {
        date: iso,
        value,
        bucket,
        payload: day?.payload,
      }
      if (inRange) {
        cells.push({
          cell,
          x: labelGutter + week * cellStep,
          y: monthHeader + dow * cellStep,
          label: formatTooltip(cell),
        })
      }
      if (inRange && dow === 0) {
        const m = date.getMonth()
        if (m !== lastMonth) {
          monthLabels.push({ x: labelGutter + week * cellStep, month: m })
          lastMonth = m
        }
      }
    }

    const weekdays = [1, 3, 5].map((dow) => ({
      dow,
      idx: (dow + weekStartsOn) % 7,
      y: monthHeader + dow * cellStep + cellSize - 1,
    }))

    return { width, height, cells, monthLabels, weekdays }
  })

  const rootLabel = $derived(
    ariaLabel ?? t('heatmap.aria.grid', {}, { defaultValue: 'Activity heatmap' }),
  )

  /**
   * Activate a clickable cell from the keyboard: Enter and Space both run the
   * same handler a mouse click does.
   *
   * @param event - The keydown event on the focused cell.
   * @param cell - The cell descriptor to pass to `onCellClick`.
   */
  function handleCellKeyDown(event: KeyboardEvent, cell: HeatmapCell): void {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onCellClick?.(cell)
  }
</script>

<svg
  width={layout.width}
  height={layout.height}
  viewBox={`0 0 ${layout.width} ${layout.height}`}
  role="group"
  aria-label={rootLabel}
  data-mol-id="heatmap"
  class={cm.cn(className)}
>
  {#if showMonthLabels}
    {#each layout.monthLabels as entry (entry.x)}
      <text
        x={entry.x}
        y={cellSize - 1}
        font-size={cellSize - 1}
        fill="currentColor"
        aria-hidden="true"
        data-mol-id={`heatmap-month-${entry.month}`}
        >{t(MONTH_KEYS[entry.month], {}, { defaultValue: MONTH_DEFAULTS[entry.month] })}</text
      >
    {/each}
  {/if}
  {#if showWeekdayLabels}
    {#each layout.weekdays as row (row.dow)}
      <text
        x={0}
        y={row.y}
        font-size={cellSize - 1}
        fill="currentColor"
        aria-hidden="true"
        data-mol-id={`heatmap-weekday-${row.idx}`}
        >{t(WEEKDAY_KEYS[row.idx], {}, { defaultValue: WEEKDAY_DEFAULTS[row.idx] })}</text
      >
    {/each}
  {/if}
  {#each layout.cells as entry (entry.cell.date)}
    <!-- The role is a ternary on `onCellClick`, which the Svelte checker cannot
         resolve: it flags `tabindex` on a "non-interactive" element although
         `role="button"` (the valid WAI-ARIA button pattern) is exactly what the
         cell carries while it is focusable. -->
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <rect
      x={entry.x}
      y={entry.y}
      width={cellSize}
      height={cellSize}
      rx={2}
      ry={2}
      fill={palette[entry.cell.bucket]}
      data-mol-id={`heatmap-cell-${entry.cell.date}`}
      data-bucket={entry.cell.bucket}
      data-value={entry.cell.value}
      role={onCellClick ? 'button' : 'img'}
      aria-label={entry.label}
      tabindex={onCellClick ? 0 : undefined}
      onclick={onCellClick ? () => onCellClick?.(entry.cell) : undefined}
      onkeydown={onCellClick ? (event) => handleCellKeyDown(event, entry.cell) : undefined}
      onmouseenter={onCellHover ? () => onCellHover?.(entry.cell) : undefined}
      style={onCellClick ? 'cursor: pointer' : undefined}
    >
      <title>{entry.label}</title>
    </rect>
  {/each}
</svg>
