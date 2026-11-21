<!--
  AnimationCanvas: the Svelte counterpart of
  `@molecule/app-feature-animation-canvas-react`'s `AnimationCanvas` — SVG
  renderer that interpolates shape state between keyframes with optional
  per-property bezier easing. Same props (React names), same ClassMap tokens,
  same DOM for the same input; clicking the canvas seeks via `onSeek`.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { interpolateState } from './interpolation.js'
  import type { AnimationCanvasProps } from './types.js'

  /** Side of the fixed square every shape is drawn as, in canvas units. */
  const DEFAULT_SHAPE_SIZE = 24

  let { keyframes, currentTime, onSeek, width, height, className }: AnimationCanvasProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  const shapes = $derived(interpolateState(keyframes, currentTime))
  const ariaLabel = $derived(
    t('animationCanvas.aria.canvas', {}, { defaultValue: 'Animation canvas' }),
  )
  const wrapperStyle = $derived(
    `overflow: hidden; touch-action: none; width: ${width}px; height: ${height}px`,
  )

  /**
   * Map a click on the canvas surface to a playhead time and surface it via
   * `onSeek`. The mapping is linear across width.
   *
   * @param event - Pointer-down event on the canvas root.
   */
  function onPointerDown(event: PointerEvent): void {
    if (!onSeek) return
    const root = event.currentTarget as SVGSVGElement | null
    const rect = root?.getBoundingClientRect()
    if (!rect || rect.width === 0) return
    const firstTime = keyframes[0]?.time ?? 0
    const lastTime = keyframes[keyframes.length - 1]?.time ?? 0
    const span = lastTime - firstTime
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    onSeek(span === 0 ? firstTime : firstTime + ratio * span)
  }
</script>

<svg
  role="img"
  aria-label={ariaLabel}
  data-mol-id="animation-canvas"
  class={cm.cn(cm.position('relative'), cm.surfaceSecondary, className)}
  {width}
  {height}
  viewBox="0 0 {width} {height}"
  onpointerdown={onPointerDown}
  style={wrapperStyle}
>
  {#each shapes as shape (shape.id)}
    <g
      data-mol-id={`animation-canvas-shape-${shape.id}`}
      data-shape-id={shape.id}
      transform={`translate(${shape.x} ${shape.y}) rotate(${shape.rotation}) scale(${shape.scale})`}
      opacity={shape.opacity}
    >
      <rect
        x={-DEFAULT_SHAPE_SIZE / 2}
        y={-DEFAULT_SHAPE_SIZE / 2}
        width={DEFAULT_SHAPE_SIZE}
        height={DEFAULT_SHAPE_SIZE}
        fill="currentColor"
        data-mol-id={`animation-canvas-shape-fill-${shape.id}`}
      />
    </g>
  {/each}
</svg>
