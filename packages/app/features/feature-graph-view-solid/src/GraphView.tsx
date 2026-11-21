import type { Component, JSX } from 'solid-js'
import { createMemo } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { boundingBox, layoutNodes } from './layout.js'
import type { GraphEdge, GraphViewProps, PositionedNode } from './types.js'

/** Default base radius (world units) of an unweighted node. */
const NODE_RADIUS = 8

/**
 * Render the default circle + label for one node. Pulled out so the
 * component stays small.
 *
 * @param node - The positioned node.
 * @param isSelected - Whether the node is currently selected.
 * @returns The default node SVG markup.
 */
function defaultNode(node: PositionedNode, isSelected: boolean): JSX.Element {
  const r = NODE_RADIUS * Math.sqrt(Math.max(0.25, node.weight ?? 1))
  return (
    <g
      data-mol-id={`graph-view-node-${node.id}`}
      data-selected={isSelected ? 'true' : 'false'}
      transform={`translate(${node.x}, ${node.y})`}
    >
      <circle
        r={r}
        fill="currentColor"
        opacity={isSelected ? 1 : 0.85}
        stroke="currentColor"
        stroke-width={isSelected ? 2 : 0}
      />
      <text
        x={r + 4}
        y={4}
        font-size="11"
        fill="currentColor"
        opacity={isSelected ? 1 : 0.75}
        style={{ 'pointer-events': 'none', 'user-select': 'none' }}
      >
        {node.label}
      </text>
    </g>
  )
}

/**
 * Force-directed graph view (Obsidian-style).
 *
 * Renders nodes + edges into an SVG, computing positions via a built-in
 * minimal velocity-Verlet simulation. Three layouts are supported —
 * `force` (default), `circular` and `grid` — and either nodes or edges
 * can be overridden via custom renderers.
 *
 * This is the Solid counterpart of `@molecule/app-feature-graph-view-react`:
 * the same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input.
 *
 * Style is driven by `getClassMap()`. Inline styles are reserved for
 * SVG geometry — `transform`, viewBox computation, stroke widths — which
 * classes can't express.
 *
 * @param props - Component props (see {@link GraphViewProps}).
 * @returns The graph-view element.
 */
export const GraphView: Component<GraphViewProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()

  // Positions depend only on (nodes, edges, layout, forceOptions), and the
  // simulation is deterministic given a fixed seed — the same computation
  // React memoizes.
  const positioned = createMemo(() =>
    layoutNodes(props.nodes, props.edges, props.layout ?? 'force', props.forceOptions),
  )

  const nodeById = createMemo(() => {
    const m = new Map<string, PositionedNode>()
    for (const n of positioned()) m.set(n.id, n)
    return m
  })

  // Compute viewBox so the graph always fits the SVG bounds, regardless of
  // the world-space size produced by the layout.
  const viewBox = createMemo(() => {
    const box = boundingBox(positioned(), 40)
    return box
      ? `${box.minX} ${box.minY} ${Math.max(1, box.maxX - box.minX)} ${Math.max(1, box.maxY - box.minY)}`
      : '-100 -100 200 200'
  })

  const ariaLabel = (): string => t('graphView.aria.canvas', {}, { defaultValue: 'Graph view' })
  const emptyLabel = (): string => t('graphView.empty', {}, { defaultValue: 'No nodes to display' })

  /**
   * One edge: a custom renderer's nodes inside a per-edge group, or the
   * default `<line>`. An edge whose endpoints are missing renders nothing.
   *
   * @param edge - The edge.
   * @returns The edge's element, or null when an endpoint is missing.
   */
  const renderEdge = (edge: GraphEdge): JSX.Element => {
    const src = nodeById().get(edge.source)
    const tgt = nodeById().get(edge.target)
    if (!src || !tgt) return null
    if (props.edgeRenderer)
      return <g data-mol-id={`graph-view-edge-${edge.id}`}>{props.edgeRenderer(edge, src, tgt)}</g>
    return (
      <line
        data-mol-id={`graph-view-edge-${edge.id}`}
        x1={src.x}
        y1={src.y}
        x2={tgt.x}
        y2={tgt.y}
        stroke="currentColor"
        stroke-width={1}
        opacity={0.4}
      />
    )
  }

  /**
   * One node's keyboard-activatable hit group, containing the custom
   * renderer's node or the default circle + label.
   *
   * @param node - The positioned node.
   * @returns The node's hit-group element.
   */
  const renderNode = (node: PositionedNode): JSX.Element => {
    const isSelected = (): boolean => node.id === props.selectedNodeId
    return (
      <g
        data-mol-id={`graph-view-node-hit-${node.id}`}
        role="button"
        aria-label={t(
          'graphView.aria.node',
          { label: node.label },
          { defaultValue: 'Node {{label}}' },
        )}
        tabindex={0}
        onClick={() => props.onNodeClick?.(node)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            props.onNodeClick?.(node)
          }
        }}
        style={{
          cursor: props.onNodeClick ? 'pointer' : 'default',
          outline: 'none',
        }}
      >
        {props.nodeRenderer ? props.nodeRenderer(node) : defaultNode(node, isSelected())}
      </g>
    )
  }

  return (
    <div
      role="application"
      aria-label={ariaLabel()}
      data-mol-id="graph-view"
      class={cm.cn(cm.position('relative'), cm.surfaceSecondary, props.className)}
      style={{ width: '100%', height: '100%', overflow: 'hidden' }}
    >
      {positioned().length === 0 ? (
        <div
          data-mol-id="graph-view-empty"
          role="status"
          class={cm.cn(cm.position('absolute'), cm.sp('p', 6))}
          style={{ inset: '0px', display: 'grid', 'place-items': 'center' }}
        >
          {emptyLabel()}
        </div>
      ) : (
        <svg
          data-mol-id="graph-view-svg"
          width="100%"
          height="100%"
          viewBox={viewBox()}
          preserveAspectRatio="xMidYMid meet"
          style={{ display: 'block' }}
        >
          <g data-mol-id="graph-view-edges">{props.edges.map(renderEdge)}</g>
          <g data-mol-id="graph-view-nodes">{positioned().map(renderNode)}</g>
        </svg>
      )}
    </div>
  )
}
