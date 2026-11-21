<!--
  AudioWaveform: the Svelte counterpart of
  `@molecule/app-feature-audio-waveform-react`'s `AudioWaveform` — stylized SVG
  audio waveform with click-to-seek + region overlays. Same props (React names),
  same ClassMap classes, inline styles, SVG geometry and callbacks, and
  therefore the same DOM for the same input.
-->
<script module lang="ts">
  /**
   * Next value of the module-wide clip-path id counter.
   *
   * React derives the clipPath id from `useId()`, which numbers ids from one
   * process-wide counter (`_r_<base32>_`). The id appears in the `clip-path`
   * attribute, which the conformance normalizer keeps verbatim, so the port
   * generates ids from the same kind of counter — unique per instance, exactly
   * React's format.
   */
  let nextClipId = 0

  /**
   * A fresh clip-path id, in React `useId()`'s `_r_<base32>_` shape.
   *
   * @returns The id prefix for this instance's clipPath.
   */
  const clipId = (): string => `_r_${(nextClipId++).toString(32)}_`
</script>

<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { AudioWaveformProps } from './types.js'
  import { clamp, seekTimeFromClick } from './utilities.js'

  let {
    peaks,
    duration,
    currentTime = 0,
    onSeek,
    regions,
    height = 64,
    progressColor,
    waveColor,
    className,
  }: AudioWaveformProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()
  // React calls `useId()` before its empty-state return, so every rendered
  // case consumes one id; take ours unconditionally to stay in step.
  const id = clipId()

  /** The mounted `<svg>`, whose bounding box maps a click to a seek time. */
  let svgNode: SVGSVGElement | undefined = $state()

  // Use a 1000-unit virtual viewBox width so the SVG scales with its CSS width.
  const viewWidth = 1000
  const minBarHeight = 1

  const safeDuration = $derived(Number.isFinite(duration) && duration > 0 ? duration : 0)
  const safeCurrent = $derived(clamp(currentTime, 0, safeDuration))
  const playedRatio = $derived(safeDuration > 0 ? safeCurrent / safeDuration : 0)
  const interactive = $derived(typeof onSeek === 'function' && duration > 0)
  const empty = $derived(peaks.length === 0)

  const totalGap = $derived(
    peaks.length > 1 ? Math.min(peaks.length - 1, Math.floor(viewWidth / 8)) : 0,
  )
  const barWidth = $derived(
    peaks.length > 0 ? Math.max((viewWidth - totalGap) / peaks.length, 0.5) : 0,
  )
  const stride = $derived(peaks.length > 0 ? viewWidth / peaks.length : 0)
  const centerY = $derived(height / 2)

  const bars = $derived(
    peaks.map((rawPeak, i) => {
      const peak = clamp(rawPeak, 0, 1)
      const barHeight = Math.max(peak * height, minBarHeight)
      const x = i * stride + (stride - barWidth) / 2
      const y = centerY - barHeight / 2
      return { x, y, w: barWidth, h: barHeight, key: i }
    }),
  )

  const progressX = $derived(playedRatio * viewWidth)

  const regionRects = $derived(
    (regions ?? []).flatMap((region) => {
      if (!Number.isFinite(region.duration) || region.duration <= 0) return []
      const startRatio = clamp(region.startTime / safeDuration, 0, 1)
      const endRatio = clamp((region.startTime + region.duration) / safeDuration, 0, 1)
      if (endRatio <= startRatio) return []
      const x = startRatio * viewWidth
      const w = (endRatio - startRatio) * viewWidth
      return [{ id: region.id, x, w, color: region.color }]
    }),
  )

  const ariaLabel = $derived(t('audioWaveform.aria.region', {}, { defaultValue: 'Audio waveform' }))
  const seekLabel = $derived(
    t('audioWaveform.aria.seek', {}, { defaultValue: 'Seek the audio by clicking the waveform' }),
  )
  const emptyLabel = $derived(
    t('audioWaveform.empty', {}, { defaultValue: 'No waveform data available.' }),
  )

  const rootClass = $derived(empty ? cm.cn(cm.sp('p', 2), className) : cm.cn(className))
  const svgStyle = $derived(
    `display: block; width: 100%; height: ${height}px; cursor: ${
      interactive ? 'pointer' : 'default'
    }; opacity: 1`,
  )
  const resolvedWaveColor = $derived(waveColor ?? 'currentColor')
  const resolvedProgressColor = $derived(progressColor ?? 'currentColor')

  /**
   * Maps a click inside the SVG onto a seek time and fires `onSeek`.
   *
   * @param event - The native click event.
   */
  function handleClick(event: MouseEvent): void {
    if (!interactive) return
    const node = svgNode
    if (!node) return
    const rect = node.getBoundingClientRect()
    const x = event.clientX - rect.left
    onSeek?.(seekTimeFromClick(x, rect.width, safeDuration))
  }
</script>

<div
  role="region"
  aria-label={ariaLabel}
  data-mol-id="audio-waveform"
  data-state={empty ? 'empty' : undefined}
  class={rootClass}
  style={empty ? undefined : 'width: 100%; color: currentColor'}
>
  {#if empty}
    <p class={cm.textSize('xs')} data-mol-id="audio-waveform-empty">{emptyLabel}</p>
  {:else}
    <svg
      bind:this={svgNode}
      viewBox={`0 0 ${viewWidth} ${height}`}
      preserveAspectRatio="none"
      width="100%"
      {height}
      onclick={handleClick}
      role={interactive ? 'button' : 'img'}
      aria-label={interactive ? seekLabel : ariaLabel}
      data-mol-id="audio-waveform-svg"
      data-interactive={interactive ? 'true' : 'false'}
      style={svgStyle}
    >
      <defs>
        <clipPath id={`${id}-progress`}>
          <rect x={0} y={0} width={progressX} {height} />
        </clipPath>
      </defs>

      <g data-mol-id="audio-waveform-bars-base" fill={resolvedWaveColor} opacity={0.4}>
        {#each bars as bar (bar.key)}
          <rect x={bar.x} y={bar.y} width={bar.w} height={bar.h} data-mol-id="audio-waveform-bar" />
        {/each}
      </g>

      <g
        data-mol-id="audio-waveform-bars-progress"
        fill={resolvedProgressColor}
        clip-path={`url(#${id}-progress)`}
      >
        {#each bars as bar (bar.key)}
          <rect
            x={bar.x}
            y={bar.y}
            width={bar.w}
            height={bar.h}
            data-mol-id="audio-waveform-bar-progress"
          />
        {/each}
      </g>

      {#if regions !== undefined && safeDuration > 0}
        <g data-mol-id="audio-waveform-regions">
          {#each regionRects as region (region.id)}
            <rect
              x={region.x}
              y={0}
              width={region.w}
              {height}
              fill={region.color ?? 'currentColor'}
              fill-opacity={region.color ? 1 : 0.15}
              data-mol-id="audio-waveform-region"
              data-region-id={region.id}
            />
          {/each}
        </g>
      {/if}
    </svg>
  {/if}
</div>
