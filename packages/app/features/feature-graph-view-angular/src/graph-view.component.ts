/**
 * GraphView component (React parity): the Angular counterpart of
 * `@molecule/app-feature-graph-view-react`'s `<GraphView>` — the same props
 * (React names), the same classes, and the same DOM for the same input.
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import { getClassMap, type UIClassMap } from '@molecule/app-ui'

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

/** One edge with both endpoints resolved. */
interface RenderableEdge {
  /** The edge. */
  edge: GraphEdge
  /** The positioned source node. */
  src: PositionedNode
  /** The positioned target node. */
  tgt: PositionedNode
}

/**
 * Force-directed graph view (Obsidian-style).
 *
 * Renders nodes + edges into an SVG, computing positions via a built-in
 * minimal velocity-Verlet simulation. Three layouts are supported —
 * `force` (default), `circular` and `grid` — and either nodes or edges
 * can be overridden via custom templates.
 *
 * The host IS the outer `<div>` (`div[mol-graph-view]`), matching React's root
 * exactly. Style is driven by `getClassMap()`. Inline styles are reserved for
 * SVG geometry — `transform`, viewBox computation, stroke widths — which
 * classes can't express.
 */
@Component({
  selector: 'div[mol-graph-view]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: [
    'nodes',
    'edges',
    'onNodeClick',
    'selectedNodeId',
    'layout',
    'nodeRenderer',
    'edgeRenderer',
    'forceOptions',
    'className',
  ],
  host: {
    role: 'application',
    '[attr.aria-label]': 'ariaLabel()',
    'data-mol-id': 'graph-view',
    '[class]': 'classes()',
    '[style.width]': '"100%"',
    '[style.height]': '"100%"',
    '[style.overflow]': '"hidden"',
  },
  template: `@if (positionedNodes().length === 0) {
      <div
        data-mol-id="graph-view-empty"
        role="status"
        [class]="emptyClasses()"
        [style.inset]="'0px'"
        [style.display]="'grid'"
        [style.place-items]="'center'"
      >
        {{ emptyLabel() }}
      </div>
    } @else {
      <svg
        data-mol-id="graph-view-svg"
        width="100%"
        height="100%"
        [attr.viewBox]="viewBox()"
        preserveAspectRatio="xMidYMid meet"
        [style.display]="'block'"
      >
        <g data-mol-id="graph-view-edges">
          @for (item of renderableEdges(); track item.edge.id) {
            @if (edgeRenderer) {
              <g [attr.data-mol-id]="'graph-view-edge-' + item.edge.id">
                <ng-container
                  [ngTemplateOutlet]="edgeRenderer"
                  [ngTemplateOutletContext]="{ a0: item.edge, a1: item.src, a2: item.tgt }"
                />
              </g>
            } @else {
              <line
                [attr.data-mol-id]="'graph-view-edge-' + item.edge.id"
                [attr.x1]="item.src.x"
                [attr.y1]="item.src.y"
                [attr.x2]="item.tgt.x"
                [attr.y2]="item.tgt.y"
                stroke="currentColor"
                stroke-width="1"
                opacity="0.4"
              />
            }
          }
        </g>
        <g data-mol-id="graph-view-nodes">
          @for (node of positionedNodes(); track node.id) {
            <g
              [attr.data-mol-id]="'graph-view-node-hit-' + node.id"
              role="button"
              [attr.aria-label]="nodeAria(node)"
              tabindex="0"
              (click)="activate(node)"
              (keydown)="keydown($event, node)"
              [style.cursor]="onNodeClick ? 'pointer' : 'default'"
              [style.outline]="'none'"
            >
              @if (nodeRenderer) {
                <ng-container
                  [ngTemplateOutlet]="nodeRenderer"
                  [ngTemplateOutletContext]="{ a0: node }"
                />
              } @else {
                <g
                  [attr.data-mol-id]="'graph-view-node-' + node.id"
                  [attr.data-selected]="isSelected(node) ? 'true' : 'false'"
                  [attr.transform]="'translate(' + node.x + ', ' + node.y + ')'"
                >
                  <circle
                    [attr.r]="radius(node)"
                    fill="currentColor"
                    [attr.opacity]="isSelected(node) ? 1 : 0.85"
                    stroke="currentColor"
                    [attr.stroke-width]="isSelected(node) ? 2 : 0"
                  />
                  <text
                    [attr.x]="radius(node) + 4"
                    y="4"
                    font-size="11"
                    fill="currentColor"
                    [attr.opacity]="isSelected(node) ? 1 : 0.75"
                    [style.pointer-events]="'none'"
                    [style.user-select]="'none'"
                  >
                    {{ node.label }}
                  </text>
                </g>
              }
            </g>
          }
        </g>
      </svg>
    }`,
})
export class GraphView {
  /** Nodes to render. */
  nodes?: GraphNode[]
  /** Edges to render. */
  edges?: GraphEdge[]
  /** Fired when the user clicks (or activates) a node. */
  onNodeClick?: (node: GraphNode) => void
  /** Currently-selected node id (highlighted in the view). */
  selectedNodeId?: string
  /** Layout strategy (defaults to `'force'` at read time). */
  layout?: GraphLayout
  /** Custom node renderer template. */
  nodeRenderer?: GraphNodeRenderer
  /** Custom edge renderer template. */
  edgeRenderer?: GraphEdgeRenderer
  /** Force-layout tunables; ignored for non-force layouts. */
  forceOptions?: ForceLayoutOptions
  /** Extra classes merged onto the outer wrapper. */
  className?: string

  /** The bonded translation function. */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the wrapper class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().position('relative'), this.cm().surfaceSecondary, this.className)
  }

  /**
   * Computes the empty-state class list.
   * @returns The class string.
   */
  emptyClasses(): string {
    return this.cm().cn(this.cm().position('absolute'), this.cm().sp('p', 6))
  }

  /**
   * The canvas' accessible name.
   * @returns The translated label.
   */
  ariaLabel(): string {
    return this.i18n.t('graphView.aria.canvas', {}, { defaultValue: 'Graph view' })
  }

  /**
   * The empty-state message.
   * @returns The translated message.
   */
  emptyLabel(): string {
    return this.i18n.t('graphView.empty', {}, { defaultValue: 'No nodes to display' })
  }

  /**
   * One node hit group's accessible name.
   * @param node - The node.
   * @returns The translated label.
   */
  nodeAria(node: GraphNode): string {
    return this.i18n.t(
      'graphView.aria.node',
      { label: node.label },
      { defaultValue: 'Node {{label}}' },
    )
  }

  /**
   * World-space positions for every node, from the chosen layout. The force
   * simulation is deterministic given a fixed seed, so repeated reads (change
   * detection runs several) produce identical coordinates.
   * @returns The positioned nodes.
   */
  positionedNodes(): PositionedNode[] {
    return layoutNodes(
      this.nodes ?? [],
      this.edges ?? [],
      this.layout ?? 'force',
      this.forceOptions,
    )
  }

  /**
   * The edges whose endpoints both exist, with both endpoints resolved.
   * @returns The renderable edges, in input order.
   */
  renderableEdges(): RenderableEdge[] {
    const byId = new Map<string, PositionedNode>()
    for (const node of this.positionedNodes()) byId.set(node.id, node)
    const out: RenderableEdge[] = []
    for (const edge of this.edges ?? []) {
      const src = byId.get(edge.source)
      const tgt = byId.get(edge.target)
      if (src && tgt) out.push({ edge, src, tgt })
    }
    return out
  }

  /**
   * The SVG viewBox that fits the layout bounds.
   * @returns The viewBox string.
   */
  viewBox(): string {
    const box = boundingBox(this.positionedNodes(), 40)
    return box
      ? `${box.minX} ${box.minY} ${Math.max(1, box.maxX - box.minX)} ${Math.max(1, box.maxY - box.minY)}`
      : '-100 -100 200 200'
  }

  /**
   * Whether a node is the selected one.
   * @param node - The node.
   * @returns True when it matches `selectedNodeId`.
   */
  isSelected(node: GraphNode): boolean {
    return node.id === this.selectedNodeId
  }

  /**
   * The rendered radius of a node, scaled by its weight.
   * @param node - The node.
   * @returns The radius in world units.
   */
  radius(node: GraphNode): number {
    return NODE_RADIUS * Math.sqrt(Math.max(0.25, node.weight ?? 1))
  }

  /**
   * Calls `onNodeClick` for a node.
   * @param node - The node.
   */
  activate(node: GraphNode): void {
    this.onNodeClick?.(node)
  }

  /**
   * Activates a node on Enter or Space, as React's keydown handler does.
   * @param event - The keyboard event.
   * @param node - The node.
   */
  keydown(event: KeyboardEvent, node: GraphNode): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      this.onNodeClick?.(node)
    }
  }
}
