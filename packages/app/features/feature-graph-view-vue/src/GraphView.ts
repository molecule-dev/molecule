/**
 * Vue force-directed graph view: the Vue counterpart of
 * `@molecule/app-feature-graph-view-react`'s `<GraphView>` — the same props
 * (React names), the same classes, and the same DOM for the same input.
 *
 * @module
 */

import { computed, defineComponent, h, type PropType, type VNode } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { boundingBox, type ForceLayoutOptions, layoutNodes } from './layout.js'
import type {
  GraphEdge,
  GraphEdgeRenderer,
  GraphLayout,
  GraphNode,
  GraphNodeRenderer,
  PositionedNode,
} from './types.js'

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
function defaultNode(node: PositionedNode, isSelected: boolean): VNode {
  const r = NODE_RADIUS * Math.sqrt(Math.max(0.25, node.weight ?? 1))
  return h(
    'g',
    {
      'data-mol-id': `graph-view-node-${node.id}`,
      'data-selected': isSelected ? 'true' : 'false',
      transform: `translate(${node.x}, ${node.y})`,
    },
    [
      h('circle', {
        r,
        fill: 'currentColor',
        opacity: isSelected ? 1 : 0.85,
        stroke: 'currentColor',
        'stroke-width': isSelected ? 2 : 0,
      }),
      h(
        'text',
        {
          x: r + 4,
          y: 4,
          'font-size': 11,
          fill: 'currentColor',
          opacity: isSelected ? 1 : 0.75,
          style: { pointerEvents: 'none', userSelect: 'none' },
        },
        [node.label],
      ),
    ],
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
 * @returns The graph-view component.
 */
export const GraphView = defineComponent({
  name: 'GraphView',
  props: {
    nodes: { type: Array as PropType<GraphNode[]>, required: true },
    edges: { type: Array as PropType<GraphEdge[]>, required: true },
    onNodeClick: Function as PropType<(node: GraphNode) => void>,
    selectedNodeId: String,
    layout: { type: String as PropType<GraphLayout>, default: 'force' },
    nodeRenderer: Function as PropType<GraphNodeRenderer>,
    edgeRenderer: Function as PropType<GraphEdgeRenderer>,
    forceOptions: Object as PropType<ForceLayoutOptions>,
    className: String,
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()

    // Positions depend only on (nodes, edges, layout, forceOptions), and the
    // simulation is deterministic given a fixed seed — the same computation
    // React memoizes, recomputed here only when one of its inputs changes.
    const positioned = computed<PositionedNode[]>(() =>
      layoutNodes(props.nodes, props.edges, props.layout ?? 'force', props.forceOptions),
    )

    const nodeById = computed(() => {
      const m = new Map<string, PositionedNode>()
      for (const n of positioned.value) m.set(n.id, n)
      return m
    })

    // Compute viewBox so the graph always fits the SVG bounds, regardless of
    // the world-space size produced by the layout.
    const viewBox = computed(() => {
      const box = boundingBox(positioned.value, 40)
      return box
        ? `${box.minX} ${box.minY} ${Math.max(1, box.maxX - box.minX)} ${Math.max(1, box.maxY - box.minY)}`
        : '-100 -100 200 200'
    })

    const ariaLabel = computed(() => t('graphView.aria.canvas', {}, { defaultValue: 'Graph view' }))
    const emptyLabel = computed(() =>
      t('graphView.empty', {}, { defaultValue: 'No nodes to display' }),
    )

    /**
     * One edge: a custom renderer's nodes inside a per-edge group, or the
     * default `<line>`. An edge whose endpoints are missing renders nothing.
     *
     * @param edge - The edge.
     * @returns The edge's vnode, or null when an endpoint is missing.
     */
    const renderEdge = (edge: GraphEdge): VNode | null => {
      const src = nodeById.value.get(edge.source)
      const tgt = nodeById.value.get(edge.target)
      if (!src || !tgt) return null
      if (props.edgeRenderer)
        return h('g', { key: edge.id, 'data-mol-id': `graph-view-edge-${edge.id}` }, [
          props.edgeRenderer(edge, src, tgt),
        ])
      return h('line', {
        key: edge.id,
        'data-mol-id': `graph-view-edge-${edge.id}`,
        x1: src.x,
        y1: src.y,
        x2: tgt.x,
        y2: tgt.y,
        stroke: 'currentColor',
        'stroke-width': 1,
        opacity: 0.4,
      })
    }

    /**
     * One node's keyboard-activatable hit group, containing the custom
     * renderer's node or the default circle + label.
     *
     * @param node - The positioned node.
     * @returns The node's hit-group vnode.
     */
    const renderNode = (node: PositionedNode): VNode => {
      const isSelected = node.id === props.selectedNodeId
      const aria = t(
        'graphView.aria.node',
        { label: node.label },
        { defaultValue: 'Node {{label}}' },
      )
      return h(
        'g',
        {
          key: node.id,
          'data-mol-id': `graph-view-node-hit-${node.id}`,
          role: 'button',
          'aria-label': aria,
          tabindex: 0,
          onClick: () => props.onNodeClick?.(node),
          onKeydown: (event: KeyboardEvent) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              props.onNodeClick?.(node)
            }
          },
          style: { cursor: props.onNodeClick ? 'pointer' : 'default', outline: 'none' },
        },
        [props.nodeRenderer ? props.nodeRenderer(node) : defaultNode(node, isSelected)],
      )
    }

    return (): VNode =>
      h(
        'div',
        {
          role: 'application',
          'aria-label': ariaLabel.value,
          'data-mol-id': 'graph-view',
          class: cm.cn(cm.position('relative'), cm.surfaceSecondary, props.className),
          style: { width: '100%', height: '100%', overflow: 'hidden' },
        },
        positioned.value.length === 0
          ? [
              h(
                'div',
                {
                  'data-mol-id': 'graph-view-empty',
                  role: 'status',
                  class: cm.cn(cm.position('absolute'), cm.sp('p', 6)),
                  style: { inset: 0, display: 'grid', placeItems: 'center' },
                },
                [emptyLabel.value],
              ),
            ]
          : [
              h(
                'svg',
                {
                  'data-mol-id': 'graph-view-svg',
                  width: '100%',
                  height: '100%',
                  viewBox: viewBox.value,
                  preserveAspectRatio: 'xMidYMid meet',
                  style: { display: 'block' },
                },
                [
                  h('g', { 'data-mol-id': 'graph-view-edges' }, props.edges.map(renderEdge)),
                  h('g', { 'data-mol-id': 'graph-view-nodes' }, positioned.value.map(renderNode)),
                ],
              ),
            ],
      )
  },
})
