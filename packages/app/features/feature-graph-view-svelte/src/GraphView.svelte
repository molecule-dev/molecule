<!--
  GraphView: the Svelte counterpart of
  `@molecule/app-feature-graph-view-react`'s `<GraphView>` — a force-directed
  node-and-edge map with built-in `force`, `circular` and `grid` layouts, click
  and keyboard activation, `selectedNodeId` highlighting, and pluggable node /
  edge snippets. Same props (React names), same classes, same DOM for the same
  input.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { boundingBox, layoutNodes } from './layout.js'
  import type { GraphViewProps, PositionedNode } from './types.js'

  let {
    nodes,
    edges,
    onNodeClick,
    selectedNodeId,
    layout = 'force',
    nodeRenderer,
    edgeRenderer,
    forceOptions,
    className,
  }: GraphViewProps = $props()

  /** Default base radius (world units) of an unweighted node. */
  const NODE_RADIUS = 8

  const cm = getClassMap()
  const { t } = useTranslation()

  // Positions depend only on (nodes, edges, layout, forceOptions), and the
  // simulation is deterministic given a fixed seed — the same computation
  // React memoizes.
  const positioned = $derived(layoutNodes(nodes, edges, layout, forceOptions))

  /**
   * The positioned node with this id, when the layout produced one.
   *
   * @param id - The node id.
   * @returns The positioned node, or undefined.
   */
  const findNode = (id: string): PositionedNode | undefined =>
    positioned.find((node) => node.id === id)

  // Compute viewBox so the graph always fits the SVG bounds, regardless of
  // the world-space size produced by the layout.
  const viewBox = $derived.by(() => {
    const box = boundingBox(positioned, 40)
    return box
      ? `${box.minX} ${box.minY} ${Math.max(1, box.maxX - box.minX)} ${Math.max(1, box.maxY - box.minY)}`
      : '-100 -100 200 200'
  })

  const ariaLabel = $derived(t('graphView.aria.canvas', {}, { defaultValue: 'Graph view' }))
  const emptyLabel = $derived(t('graphView.empty', {}, { defaultValue: 'No nodes to display' }))
</script>

<div
  role="application"
  aria-label={ariaLabel}
  data-mol-id="graph-view"
  class={cm.cn(cm.position('relative'), cm.surfaceSecondary, className)}
  style:width="100%"
  style:height="100%"
  style:overflow="hidden"
>
  {#if positioned.length === 0}
    <div
      data-mol-id="graph-view-empty"
      role="status"
      class={cm.cn(cm.position('absolute'), cm.sp('p', 6))}
      style:inset="0px"
      style:display="grid"
      style:place-items="center"
    >
      {emptyLabel}
    </div>
  {:else}
    <svg
      data-mol-id="graph-view-svg"
      width="100%"
      height="100%"
      {viewBox}
      preserveAspectRatio="xMidYMid meet"
      style:display="block"
    >
      <g data-mol-id="graph-view-edges"
        >{#each edges as edge (edge.id)}{@const src = findNode(edge.source)}{@const tgt = findNode(
            edge.target,
          )}{#if src && tgt}{#if edgeRenderer}<g data-mol-id="graph-view-edge-{edge.id}"
                >{@render edgeRenderer?.(edge, src, tgt)}</g
              >{:else}<line
                data-mol-id="graph-view-edge-{edge.id}"
                x1={src.x}
                y1={src.y}
                x2={tgt.x}
                y2={tgt.y}
                stroke="currentColor"
                stroke-width="1"
                opacity="0.4"
              ></line>{/if}{/if}{/each}</g
      >
      <g data-mol-id="graph-view-nodes"
        >{#each positioned as node (node.id)}{@const isSelected =
            node.id === selectedNodeId}{@const r =
            NODE_RADIUS * Math.sqrt(Math.max(0.25, node.weight ?? 1))}<g
            data-mol-id="graph-view-node-hit-{node.id}"
            role="button"
            aria-label={t(
              'graphView.aria.node',
              { label: node.label },
              { defaultValue: 'Node {{label}}' },
            )}
            tabindex="0"
            onclick={() => onNodeClick?.(node)}
            onkeydown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onNodeClick?.(node)
              }
            }}
            style:cursor={onNodeClick ? 'pointer' : 'default'}
            style:outline="none"
            >{#if nodeRenderer}{@render nodeRenderer?.(node)}{:else}<g
                data-mol-id="graph-view-node-{node.id}"
                data-selected={isSelected ? 'true' : 'false'}
                transform="translate({node.x}, {node.y})"
                ><circle
                  {r}
                  fill="currentColor"
                  opacity={isSelected ? 1 : 0.85}
                  stroke="currentColor"
                  stroke-width={isSelected ? 2 : 0}
                ></circle><text
                  x={r + 4}
                  y="4"
                  font-size="11"
                  fill="currentColor"
                  opacity={isSelected ? 1 : 0.75}
                  style:pointer-events="none"
                  style:user-select="none">{node.label}</text
                ></g
              >{/if}</g
          >{/each}</g
      >
    </svg>
  {/if}
</div>
