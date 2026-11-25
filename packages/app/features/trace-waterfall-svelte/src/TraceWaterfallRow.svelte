<!--
  TraceWaterfallRow: one rendered span row — the indented label column (service
  tag + operation name) beside the positioned bar and its duration badge.
  Internal to the package (not exported); `TraceWaterfall` renders one per row.
-->
<script lang="ts">
  import { useLocale, useT } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { reactStyle } from '@molecule/app-ui-svelte'

  import {
    BAR_HEIGHT_PX,
    DEFAULT_BAR_COLOR,
    DEPTH_INDENT_PX,
    ROW_HEIGHT_PX,
    STATUS_COLOR,
  } from './constants.js'
  import { translateDuration } from './format.js'
  import { serviceColor } from './layout.js'
  import type { Span, SpanRow } from './types.js'

  let {
    row,
    labelColumnWidth,
    selected,
    onSpanClick,
  }: {
    /** The layout row to render. */
    row: SpanRow
    /** Pixel width of the left-hand label column. */
    labelColumnWidth: number
    /** Whether this span is the selected one. */
    selected: boolean
    /** The optional row-selection callback. */
    onSpanClick?: (span: Span) => void
  } = $props()

  const cm = $derived(getClassMap())
  const t = useT()
  // Read through `$activeLocale` in the badge, so the label follows a locale switch.
  const activeLocale = useLocale()

  const interactive = $derived(Boolean(onSpanClick))
  const barColor = $derived(row.span.status ? STATUS_COLOR[row.span.status] : DEFAULT_BAR_COLOR)
  const tagColor = $derived(row.span.service ? serviceColor(row.span.service) : undefined)
  const durationText = $derived(translateDuration(row.span.duration, $activeLocale, t))
  // The badge and the `{{duration}}` of the row's aria label both name the same
  // duration, so both go through `translateDuration`: the number follows the
  // app's locale and a screen reader announces what the badge shows.
  const ariaLabel = $derived(
    t(
      'traceWaterfall.row.aria',
      {
        name: row.span.name,
        service: row.span.service ?? '',
        duration: durationText,
      },
      {
        defaultValue: '{{service}} · {{name}} · {{duration}}',
      },
    ),
  )

  /**
   * Activates the row from the keyboard: Enter or Space selects the span, as
   * React's `onKeyDown` does.
   *
   * @param ev - The key event.
   */
  const handleKey = (ev: KeyboardEvent): void => {
    if (!onSpanClick) return
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault()
      onSpanClick(row.span)
    }
  }
</script>

<div
  class={cm.cn(cm.flex({ align: 'center' }))}
  use:reactStyle={{ height: `${ROW_HEIGHT_PX}px` }}
  role="treeitem"
  aria-level={row.depth + 1}
  aria-selected={selected ? 'true' : 'false'}
  aria-label={ariaLabel}
  tabindex={interactive ? 0 : -1}
  onclick={onSpanClick ? () => onSpanClick(row.span) : undefined}
  onkeydown={handleKey}
  data-mol-id="trace-waterfall-row"
  data-span-id={row.span.id}
>
  <div
    class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('xs'))}
    use:reactStyle={{
      width: `${labelColumnWidth}px`,
      flexShrink: 0,
      paddingLeft: `${row.depth * DEPTH_INDENT_PX}px`,
      cursor: interactive ? 'pointer' : 'default',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
    }}
  >
    {#if row.span.service}
      <span
        data-mol-id="trace-waterfall-service-tag"
        use:reactStyle={{
          display: 'inline-block',
          padding: '0 6px',
          borderRadius: '4px',
          background: tagColor,
          color: '#fff',
          fontWeight: 600,
          fontSize: '10px',
          lineHeight: '14px',
          flexShrink: 0,
        }}
      >
        {row.span.service}
      </span>
    {/if}
    <span
      use:reactStyle={{ overflow: 'hidden', textOverflow: 'ellipsis' }}
      data-mol-id="trace-waterfall-name"
    >
      {row.span.name}
    </span>
  </div>
  <div
    use:reactStyle={{
      position: 'relative',
      flex: '1',
      height: `${ROW_HEIGHT_PX}px`,
      cursor: interactive ? 'pointer' : 'default',
    }}
  >
    <div
      data-mol-id="trace-waterfall-bar"
      use:reactStyle={{
        position: 'absolute',
        top: `${(ROW_HEIGHT_PX - BAR_HEIGHT_PX) / 2}px`,
        left: `${row.startFraction * 100}%`,
        width: `${Math.max(row.widthFraction * 100, 0.5)}%`,
        height: `${BAR_HEIGHT_PX}px`,
        background: barColor,
        borderRadius: '2px',
      }}
    ></div>
    <div
      data-mol-id="trace-waterfall-duration"
      use:reactStyle={{
        position: 'absolute',
        top: '0px',
        left: `calc(${row.startFraction * 100}% + ${Math.max(row.widthFraction * 100, 0.5)}% + 6px)`,
        height: `${ROW_HEIGHT_PX}px`,
        display: 'flex',
        alignItems: 'center',
        fontSize: '11px',
        opacity: 0.75,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
      }}
    >
      {durationText}
    </div>
  </div>
</div>
