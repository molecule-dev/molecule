<!--
  TraceWaterfallAxis: the waterfall's top time axis — the translated total
  duration beside `AXIS_TICK_COUNT` evenly spaced, absolutely positioned ticks.
  Internal to the package (not exported); `TraceWaterfall` renders it.
-->
<script lang="ts">
  import { useLocale, useT } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { reactStyle } from '@molecule/app-ui-svelte'

  import { AXIS_TICK_COUNT } from './constants.js'
  import { translateDuration } from './format.js'

  let {
    traceDuration,
    labelColumnWidth,
    totalLabel,
  }: {
    /** The trace's total duration. */
    traceDuration: number
    /** Pixel width of the left-hand label column. */
    labelColumnWidth: number
    /** The translated total-duration label. */
    totalLabel: string
  } = $props()

  const cm = $derived(getClassMap())
  // Read through `$activeLocale` in the ticks, so the labels follow a locale switch.
  const t = useT()
  const activeLocale = useLocale()

  /** The tick marks: a percentage `left` and the translated duration it labels. */
  const ticks = $derived(
    Array.from({ length: AXIS_TICK_COUNT }, (_unused, i) => {
      const fraction = i / (AXIS_TICK_COUNT - 1)
      return {
        left: `${fraction * 100}%`,
        label: translateDuration(fraction * traceDuration, $activeLocale, t),
      }
    }),
  )
</script>

<div
  class={cm.cn(cm.flex({ align: 'center' }), cm.textSize('xs'))}
  data-mol-id="trace-waterfall-axis"
>
  <div use:reactStyle={{ width: `${labelColumnWidth}px`, flexShrink: 0, opacity: 0.7 }}>
    {totalLabel}
  </div>
  <div use:reactStyle={{ position: 'relative', flex: '1', height: '18px' }}>
    {#each ticks as tick, i (i)}
      <div
        use:reactStyle={{
          position: 'absolute',
          left: tick.left,
          top: '0px',
          transform: 'translateX(-50%)',
          opacity: 0.7,
          whiteSpace: 'nowrap',
        }}
        data-mol-id="trace-waterfall-axis-tick"
      >
        {tick.label}
      </div>
    {/each}
  </div>
</div>
