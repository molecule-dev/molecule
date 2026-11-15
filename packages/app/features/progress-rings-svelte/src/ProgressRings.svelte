<!--
  ProgressRings: the Svelte counterpart of `@molecule/app-progress-rings-react`'s
  `ProgressRings` — the same props (React names), the same ClassMap classes and
  the same DOM for the same input. Rings render index-keyed (`{#each … (i)}`),
  matching React's per-ring keys, so equal new data keeps the rendered nodes.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { ProgressRing, ProgressRingsProps } from './types.js'

  /** Internal: one ring's geometry (radius + arc lengths). */
  interface RingGeometry {
    radius: number
    circumference: number
    filledLength: number
  }

  let {
    rings,
    size = 160,
    strokeWidth = 12,
    gap = 4,
    cornerRadius = 'round',
    className,
    dataMolId,
    ariaLabel,
  }: ProgressRingsProps = $props()

  const { t } = useTranslation()
  const cm = $derived(getClassMap())
  const center = $derived(size / 2)

  const summary = $derived(
    ariaLabel ??
      t(
        'progressRings.summary',
        { count: rings.length },
        {
          defaultValue: 'Progress rings ({{count}} rings)',
        },
      ),
  )

  /**
   * Compute geometry for a single ring at index `i` — rings are nested
   * inside-out, each one (strokeWidth + gap) inward of the previous.
   *
   * @param i - Ring index (0 = outermost).
   * @param ring - The ring data.
   * @returns Computed radius / circumference / filled-length for the ring.
   */
  const geometry = (i: number, ring: ProgressRing): RingGeometry => {
    const radius = size / 2 - strokeWidth / 2 - i * (strokeWidth + gap)
    const circumference = 2 * Math.PI * Math.max(radius, 0)
    const safeMax = ring.max > 0 ? ring.max : 1
    const ratio = Math.max(0, Math.min(1, ring.value / safeMax))
    return { radius, circumference, filledLength: circumference * ratio }
  }

  /**
   * The ring's accessible label (an explicit `label` wins).
   *
   * @param i - Ring index (0 = outermost).
   * @param label - The ring's own label, when it has one.
   * @returns The label text.
   */
  const ringLabel = (i: number, label?: string): string =>
    label ?? t('progressRings.ring', { index: i + 1 }, { defaultValue: 'Ring {{index}}' })
</script>

<svg
  class={cm.cn(className)}
  data-mol-id={dataMolId ?? 'progress-rings'}
  role="img"
  aria-label={summary}
  width={size}
  height={size}
  viewBox="0 0 {size} {size}"
>
  {#each rings as ring, i (i)}
    {@const geo = geometry(i, ring)}
    {#if geo.radius > 0}
      <g role="img" aria-label={ringLabel(i, ring.label)}>
        <circle
          cx={center}
          cy={center}
          r={geo.radius}
          fill="none"
          stroke={ring.color}
          stroke-opacity="0.18"
          stroke-width={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={geo.radius}
          fill="none"
          stroke={ring.color}
          stroke-width={strokeWidth}
          stroke-linecap={cornerRadius}
          stroke-dasharray="{geo.filledLength} {geo.circumference}"
          transform="rotate(-90 {center} {center})"
        />
      </g>
    {/if}
  {/each}
</svg>
