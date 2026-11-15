<!--
  Sparkline: the Svelte counterpart of `@molecule/app-sparkline-react`'s
  `Sparkline` — a tiny inline SVG trend chart (line, bar, dot variants).
  Same props (React names), same DOM for the same input; an empty `values`
  renders nothing. The bar and dot lists render unkeyed (`{#each}` by
  index), matching React's per-item keys, so a new array of equal values
  keeps the rendered nodes.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { SparklineProps } from './types.js'

  let {
    values,
    variant = 'line',
    width = 80,
    height = 24,
    color = 'currentColor',
    ariaLabel,
    className,
  }: SparklineProps = $props()

  const cm = $derived(getClassMap())
  const min = $derived(Math.min(...values))
  const max = $derived(Math.max(...values))
  const range = $derived(max - min || 1)
  const stepX = $derived(values.length === 1 ? 0 : width / (values.length - 1))
  const barWidth = $derived(Math.max(2, width / values.length - 2))
  const points = $derived(
    values.map((v, i) => `${i * stepX},${height - ((v - min) / range) * height}`).join(' '),
  )

  /**
   * The vertical pixel of a value: the bottom edge minus its normalized height.
   *
   * @param v - The value.
   * @returns The y coordinate inside the viewBox.
   */
  const y = (v: number): number => height - ((v - min) / range) * height
</script>

{#if values.length > 0}
  <svg
    {width}
    {height}
    viewBox="0 0 {width} {height}"
    role="img"
    aria-label={ariaLabel ?? 'Trend sparkline'}
    class={cm.cn(className)}
  >
    {#if variant === 'line'}
      <polyline fill="none" stroke={color} stroke-width="1.5" {points} />
    {:else if variant === 'bar'}
      {#each values as v, i (i)}
        <rect
          x={i * (barWidth + 2)}
          y={height - ((v - min) / range) * height}
          width={barWidth}
          height={((v - min) / range) * height}
          fill={color}
        />
      {/each}
    {:else if variant === 'dot'}
      {#each values as v, i (i)}
        <circle cx={i * stepX} cy={y(v)} r="1.5" fill={color} />
      {/each}
    {/if}
  </svg>
{/if}
