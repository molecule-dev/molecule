<!--
  CanvasEdge: the Svelte counterpart of `@molecule/app-feature-canvas-react`'s
  `<CanvasEdge>` — generic edge between two canvas-space points, with 'line',
  'bezier' or 'orthogonal' geometry. Same props (React names), same DOM.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { buildEdgePath } from './edges.js'
  import type { CanvasEdgeProps } from './types.js'

  let {
    from,
    to,
    kind = 'line',
    strokeWidth = 2,
    stroke = 'currentColor',
    ariaLabel,
    className,
  }: CanvasEdgeProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  const margin = $derived(Math.max(20, strokeWidth * 4))
  const minX = $derived(Math.min(from.x, to.x) - margin)
  const minY = $derived(Math.min(from.y, to.y) - margin)
  const width = $derived(Math.abs(to.x - from.x) + margin * 2)
  const height = $derived(Math.abs(to.y - from.y) + margin * 2)

  // The path in viewBox-local coordinates, so the <svg> can sit at (minX, minY)
  // with the geometry inside starting at 0,0.
  const d = $derived(
    buildEdgePath({ x: from.x - minX, y: from.y - minY }, { x: to.x - minX, y: to.y - minY }, kind),
  )

  const wrapperStyle = $derived(
    `position: absolute; left: ${minX}px; top: ${minY}px; width: ${width}px; height: ${height}px; pointer-events: none; overflow: visible`,
  )

  const resolvedAriaLabel = $derived(
    ariaLabel ?? t('canvas.aria.edge', {}, { defaultValue: 'Canvas edge' }),
  )
</script>

<svg
  role="img"
  aria-label={resolvedAriaLabel}
  data-mol-id="canvas-edge"
  data-edge-kind={kind}
  class={cm.cn(cm.position('absolute'), className)}
  style={wrapperStyle}
  {width}
  {height}
  viewBox="0 0 {width} {height}"
>
  <path
    {d}
    fill="none"
    {stroke}
    stroke-width={strokeWidth}
    stroke-linecap="round"
    stroke-linejoin="round"
    data-mol-id="canvas-edge-path"
  />
</svg>
