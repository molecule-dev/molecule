<!--
  VectorElementSvg: the Svelte counterpart of
  `@molecule/app-canvas-engine-react`'s `VectorElementSvg` — a pure-presentational
  SVG renderer for one vector element. It owns no state or pointer handlers;
  `CanvasEngine` wraps each element in its own pointer-capturing layer. Same
  attributes, styles and text for the same element.
-->
<script lang="ts">
  import type { VectorElement, VectorElementSvgProps, VectorStyle } from './types.js'
  import VectorElementSvgSelf from './VectorElementSvg.svelte'

  let { element, selected }: VectorElementSvgProps = $props()

  /**
   * Apply an element's transform to an SVG `transform` string.
   *
   * @param el - Element to read.
   * @returns The `transform` attribute, or `undefined` for identity.
   */
  function transformAttr(el: VectorElement): string | undefined {
    const t = el.transform
    if (!t) return undefined
    const parts: string[] = []
    // Rotate around the element centre (lines pivot around their midpoint).
    if (t.rotation != null && t.rotation !== 0) {
      let cx: number
      let cy: number
      if (el.kind === 'line') {
        cx = (el.x1 + el.x2) / 2
        cy = (el.y1 + el.y2) / 2
      } else {
        cx = el.x + el.width / 2
        cy = el.y + el.height / 2
      }
      parts.push(`rotate(${t.rotation} ${cx} ${cy})`)
    }
    if ((t.scaleX != null && t.scaleX !== 1) || (t.scaleY != null && t.scaleY !== 1)) {
      parts.push(`scale(${t.scaleX ?? 1} ${t.scaleY ?? 1})`)
    }
    return parts.length > 0 ? parts.join(' ') : undefined
  }

  /** Fill paint (`none` when the element has no fill). */
  const fill = $derived<VectorStyle['fill']>(element.fill ?? 'none')
  /** Stroke paint, or `undefined` when the element has none. */
  const stroke = $derived(element.stroke)
  /** Stroke width, or `undefined` when the element has none. */
  const strokeWidth = $derived(
    stroke != null ? (element.strokeWidth ?? 1) : (element.strokeWidth ?? undefined),
  )
  /** Inline style for opacity and blend mode. */
  const styleText = $derived(
    [
      element.opacity != null ? `opacity: ${element.opacity}` : '',
      element.blendMode != null ? `mix-blend-mode: ${element.blendMode}` : '',
    ]
      .filter(Boolean)
      .join('; '),
  )
  /** The element's transform attribute. */
  const transform = $derived(transformAttr(element))
  /** Whether the element is selected, as the attribute spells it. */
  const selectedAttr = $derived(selected ? 'true' : 'false')
</script>

<g
  data-mol-id="canvas-engine-element"
  data-canvas-element-id={element.id}
  data-canvas-element-kind={element.kind}
  data-selected={selectedAttr}
  {transform}
  style={styleText || undefined}
>
  {#if element.kind === 'rect'}
    <rect
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      rx={element.cornerRadius}
      ry={element.cornerRadius}
      {fill}
      {stroke}
      stroke-width={strokeWidth}
    />
  {:else if element.kind === 'ellipse'}
    <ellipse
      cx={element.x + element.width / 2}
      cy={element.y + element.height / 2}
      rx={element.width / 2}
      ry={element.height / 2}
      {fill}
      {stroke}
      stroke-width={strokeWidth}
    />
  {:else if element.kind === 'line'}
    <line
      x1={element.x1}
      y1={element.y1}
      x2={element.x2}
      y2={element.y2}
      stroke={stroke ?? fill}
      stroke-width={strokeWidth ?? 1}
    />
  {:else if element.kind === 'path'}
    <g transform={`translate(${element.x} ${element.y})`}>
      <path d={element.d} {fill} {stroke} stroke-width={strokeWidth} />
    </g>
  {:else if element.kind === 'text'}
    <text
      x={element.x}
      y={element.y + (element.fontSize ?? 16)}
      fill={element.fill ?? '#000000'}
      {stroke}
      stroke-width={strokeWidth}
      font-size={element.fontSize ?? 16}
      font-family={element.fontFamily ?? 'system-ui, sans-serif'}
      font-weight={element.fontWeight ?? 'normal'}>{element.text}</text
    >
  {:else}
    {#each element.children as child (child.id)}
      <VectorElementSvgSelf element={child} {selected} />
    {/each}
  {/if}
</g>
