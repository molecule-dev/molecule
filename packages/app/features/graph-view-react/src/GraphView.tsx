import type { CSSProperties, ReactElement } from 'react'
import { useMemo } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { boundingBox, type ForceLayoutOptions, layoutNodes } from './layout.js'
import type {
  GraphEdge,
  GraphEdgeRenderer,
  GraphLayout,
  GraphNode,
  GraphNodeRenderer,
  PositionedNode,
} from './types.js'

/** `<GraphView>` props. */
export interface GraphViewProps {
  /** Nodes to render. */
  nodes: GraphNode[]
  /** Edges to render. */
  edges: GraphEdge[]
  /** Fired when the user clicks (or activates) a node. */
  onNodeClick?: (node: GraphNode) => void
  /** Currently-selected node id (highlighted in the view). */
  selectedNodeId?: string
  /** Layout strategy. Defaults to `'force'`. */
  layout?: GraphLayout
  /** Custom node renderer (overrides the default circle + label). */
  nodeRenderer?: GraphNodeRenderer
  /** Custom edge renderer (overrides the default `<line>`). */
  edgeRenderer?: GraphEdgeRenderer
  /** Force-layout tunables; ignored for non-force layouts. */
  forceOptions?: ForceLayoutOptions
  /** Extra classes merged onto the outer wrapper. */
  className?: string
}

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
function defaultNodeRenderer(node: PositionedNode, isSelected: boolean): ReactElement {
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
        strokeWidth={isSelected ? 2 : 0}
      />
      <text
        x={r + 4}
        y={4}
        fontSize={11}
        fill="currentColor"
        opacity={isSelected ? 1 : 0.75}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
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
 * Style is driven by `getClassMap()`. Inline styles are reserved for
 * SVG geometry — `transform`, viewBox computation, stroke widths — which
 * classes can't express.
 *
 * @param props - Component props.
 * @returns The graph-view element.
 * @example
 * ```tsx
 * <GraphView
 *   nodes={[
 *     { id: 'a', label: 'Alpha' },
 *     { id: 'b', label: 'Beta', group: 'project' },
 *   ]}
 *   edges={[{ id: 'e1', source: 'a', target: 'b' }]}
 *   onNodeClick={(n) => navigate(`/notes/${n.id}`)}
 * />
 * ```
 */
export function GraphView(props: GraphViewProps): ReactElement {
  const cm = getClassMap()
  const { t } = useTranslation()

  const {
    nodes,
    edges,
    onNodeClick,
    selectedNodeId,
    layout = 'force',
    nodeRenderer,
    edgeRenderer,
    forceOptions,
    className,
  } = props

  // Compute positions once per (nodes, edges, layout) tuple. The force
  // simulation is deterministic given a fixed seed, so re-renders without
  // input changes don't re-run the loop.
  const positioned = useMemo<PositionedNode[]>(
    () => layoutNodes(nodes, edges, layout, forceOptions),
    [nodes, edges, layout, forceOptions],
  )

  const nodeById = useMemo(() => {
    const m = new Map<string, PositionedNode>()
    for (const n of positioned) m.set(n.id, n)
    return m
  }, [positioned])

  // Compute viewBox so the graph always fits the SVG bounds, regardless of
  // the world-space size produced by the layout.
  const box = useMemo(() => boundingBox(positioned, 40), [positioned])
  const viewBox = box
    ? `${box.minX} ${box.minY} ${Math.max(1, box.maxX - box.minX)} ${Math.max(1, box.maxY - box.minY)}`
    : '-100 -100 200 200'

  const ariaLabel = t('graphView.aria.canvas', {}, { defaultValue: 'Graph view' })
  const emptyLabel = t('graphView.empty', {}, { defaultValue: 'No nodes to display' })

  const wrapperStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  }

  return (
    <div
      role="application"
      aria-label={ariaLabel}
      data-mol-id="graph-view"
      className={cm.cn(cm.position('relative'), cm.surfaceSecondary, className)}
      style={wrapperStyle}
    >
      {positioned.length === 0 ? (
        <div
          data-mol-id="graph-view-empty"
          role="status"
          className={cm.cn(cm.position('absolute'), cm.sp('p', 6))}
          style={{ inset: 0, display: 'grid', placeItems: 'center' }}
        >
          {emptyLabel}
        </div>
      ) : (
        <svg
          data-mol-id="graph-view-svg"
          width="100%"
          height="100%"
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          style={{ display: 'block' }}
        >
          <g data-mol-id="graph-view-edges">
            {edges.map((edge) => {
              const src = nodeById.get(edge.source)
              const tgt = nodeById.get(edge.target)
              if (!src || !tgt) return null
              if (edgeRenderer) {
                return (
                  <g key={edge.id} data-mol-id={`graph-view-edge-${edge.id}`}>
                    {edgeRenderer(edge, src, tgt)}
                  </g>
                )
              }
              return (
                <line
                  key={edge.id}
                  data-mol-id={`graph-view-edge-${edge.id}`}
                  x1={src.x}
                  y1={src.y}
                  x2={tgt.x}
                  y2={tgt.y}
                  stroke="currentColor"
                  strokeWidth={1}
                  opacity={0.4}
                />
              )
            })}
          </g>

          <g data-mol-id="graph-view-nodes">
            {positioned.map((node) => {
              const isSelected = node.id === selectedNodeId
              const aria = t(
                'graphView.aria.node',
                { label: node.label },
                { defaultValue: `Node ${node.label}` },
              )
              return (
                <g
                  key={node.id}
                  data-mol-id={`graph-view-node-hit-${node.id}`}
                  role="button"
                  aria-label={aria}
                  tabIndex={0}
                  onClick={() => onNodeClick?.(node)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onNodeClick?.(node)
                    }
                  }}
                  style={{ cursor: onNodeClick ? 'pointer' : 'default', outline: 'none' }}
                >
                  {nodeRenderer ? nodeRenderer(node) : defaultNodeRenderer(node, isSelected)}
                </g>
              )
            })}
          </g>
        </svg>
      )}
    </div>
  )
}
