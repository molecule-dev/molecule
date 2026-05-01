import type { GraphEdge, GraphLayout, GraphNode, PositionedNode } from './types.js'

/**
 * Pure (React-free) layout helpers for `<GraphView>`. Extracted so the
 * math is unit-testable without React / jsdom.
 *
 * @module
 */

/** Default cap on force-layout iterations. */
export const DEFAULT_FORCE_ITERATIONS = 200

/** Default repulsion strength used by `forceLayout`. */
export const DEFAULT_REPULSION = 800

/** Default spring stiffness used by `forceLayout`. */
export const DEFAULT_SPRING = 0.05

/** Default ideal edge length used by `forceLayout`. */
export const DEFAULT_REST_LENGTH = 80

/** Default velocity damping used by `forceLayout`. */
export const DEFAULT_DAMPING = 0.85

/** Convergence threshold (max per-node displacement squared). */
export const CONVERGENCE_EPSILON = 0.01

/** Force-layout tunables. */
export interface ForceLayoutOptions {
  /** Hard cap on iterations. Defaults to {@link DEFAULT_FORCE_ITERATIONS}. */
  iterations?: number
  /** Repulsive constant between every pair of nodes. */
  repulsion?: number
  /** Spring (Hooke) constant for edges. */
  spring?: number
  /** Ideal edge length (rest distance). */
  restLength?: number
  /** Velocity damping per step (0–1). */
  damping?: number
  /** Optional deterministic seed (for tests). Defaults to a fixed value. */
  seed?: number
}

/**
 * Tiny deterministic PRNG (mulberry32). Allows reproducible initial
 * positions in tests without depending on `Math.random()`.
 *
 * @param seed - 32-bit unsigned seed.
 * @returns A function returning floats in `[0, 1)`.
 */
export function createRng(seed: number): () => number {
  let s = seed >>> 0
  return function rand() {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Place nodes evenly around the unit circle (scaled by `radius`).
 *
 * @param nodes - Nodes to position.
 * @param radius - Circle radius in world units.
 * @returns Positioned nodes, in input order.
 */
export function circularLayout(nodes: GraphNode[], radius: number): PositionedNode[] {
  if (nodes.length === 0) return []
  if (nodes.length === 1) return [{ ...nodes[0], x: 0, y: 0 }]
  return nodes.map((n, i) => {
    const angle = (i / nodes.length) * Math.PI * 2
    return { ...n, x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }
  })
}

/**
 * Place nodes on a square-ish grid, centred on the origin.
 *
 * @param nodes - Nodes to position.
 * @param spacing - Pixel spacing between adjacent grid cells.
 * @returns Positioned nodes, in input order.
 */
export function gridLayout(nodes: GraphNode[], spacing: number): PositionedNode[] {
  if (nodes.length === 0) return []
  const cols = Math.max(1, Math.ceil(Math.sqrt(nodes.length)))
  const rows = Math.ceil(nodes.length / cols)
  const offsetX = ((cols - 1) * spacing) / 2
  const offsetY = ((rows - 1) * spacing) / 2
  return nodes.map((n, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    return { ...n, x: col * spacing - offsetX, y: row * spacing - offsetY }
  })
}

/**
 * Run a minimal velocity-Verlet force-directed simulation.
 *
 * Implements:
 * - Pairwise repulsion (Coulomb-like, O(n²)) between every node pair.
 * - Spring (Hooke) attraction along each edge toward `restLength`.
 * - Per-step velocity damping for stability.
 *
 * Stops early once the maximum per-node displacement-squared drops below
 * {@link CONVERGENCE_EPSILON}, or after `iterations` steps — whichever
 * comes first.
 *
 * @param nodes - Nodes to lay out.
 * @param edges - Edges (used only for attractive springs).
 * @param options - Force-layout tunables.
 * @returns Positioned nodes, in input order.
 */
export function forceLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: ForceLayoutOptions = {},
): PositionedNode[] {
  const iterations = options.iterations ?? DEFAULT_FORCE_ITERATIONS
  const repulsion = options.repulsion ?? DEFAULT_REPULSION
  const spring = options.spring ?? DEFAULT_SPRING
  const restLength = options.restLength ?? DEFAULT_REST_LENGTH
  const damping = options.damping ?? DEFAULT_DAMPING
  const rand = createRng(options.seed ?? 0x9e3779b9)

  const n = nodes.length
  if (n === 0) return []

  // Seed positions on a small circle so all-pairs repulsion has somewhere
  // to push from on iteration 0 (true zero-vectors give NaN directions).
  const seedRadius = Math.max(20, Math.sqrt(n) * 10)
  const x = new Float64Array(n)
  const y = new Float64Array(n)
  const vx = new Float64Array(n)
  const vy = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    const angle = (i / Math.max(1, n)) * Math.PI * 2 + rand() * 0.5
    const jitter = 1 + rand() * 0.5
    x[i] = Math.cos(angle) * seedRadius * jitter
    y[i] = Math.sin(angle) * seedRadius * jitter
  }

  // Map id → index once (edges reference ids).
  const idx = new Map<string, number>()
  for (let i = 0; i < n; i++) idx.set(nodes[i].id, i)

  // Precompute valid edges (both endpoints present, not self-loops).
  const ea: number[] = []
  const eb: number[] = []
  const ew: number[] = []
  for (const e of edges) {
    const a = idx.get(e.source)
    const b = idx.get(e.target)
    if (a === undefined || b === undefined || a === b) continue
    ea.push(a)
    eb.push(b)
    ew.push(e.weight ?? 1)
  }

  for (let step = 0; step < iterations; step++) {
    // Reset force accumulator (we reuse vx/vy as fx/fy then integrate).
    const fx = new Float64Array(n)
    const fy = new Float64Array(n)

    // Pairwise repulsion — O(n²). Acceptable for the small graphs the
    // note-taking app will throw at this (hundreds, not millions, of nodes).
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = x[i] - x[j]
        let dy = y[i] - y[j]
        let distSq = dx * dx + dy * dy
        if (distSq < 1e-4) {
          // Two nodes on top of each other — nudge them apart.
          dx = (rand() - 0.5) * 0.1
          dy = (rand() - 0.5) * 0.1
          distSq = dx * dx + dy * dy + 1e-4
        }
        const dist = Math.sqrt(distSq)
        const f = repulsion / distSq
        const fxi = (dx / dist) * f
        const fyi = (dy / dist) * f
        fx[i] += fxi
        fy[i] += fyi
        fx[j] -= fxi
        fy[j] -= fyi
      }
    }

    // Edge springs.
    for (let k = 0; k < ea.length; k++) {
      const a = ea[k]
      const b = eb[k]
      const w = ew[k]
      const dx = x[b] - x[a]
      const dy = y[b] - y[a]
      const dist = Math.sqrt(dx * dx + dy * dy) || 1e-4
      const displacement = dist - restLength
      const f = spring * displacement * w
      const fxk = (dx / dist) * f
      const fyk = (dy / dist) * f
      fx[a] += fxk
      fy[a] += fyk
      fx[b] -= fxk
      fy[b] -= fyk
    }

    // Integrate (semi-implicit Euler with damping).
    let maxDispSq = 0
    for (let i = 0; i < n; i++) {
      vx[i] = (vx[i] + fx[i]) * damping
      vy[i] = (vy[i] + fy[i]) * damping
      const dx = vx[i]
      const dy = vy[i]
      x[i] += dx
      y[i] += dy
      const dispSq = dx * dx + dy * dy
      if (dispSq > maxDispSq) maxDispSq = dispSq
    }

    if (maxDispSq < CONVERGENCE_EPSILON) break
  }

  return nodes.map((node, i) => ({ ...node, x: x[i], y: y[i] }))
}

/**
 * Compute world-space positions for every node using the chosen layout.
 *
 * @param nodes - Nodes to position.
 * @param edges - Edges (consumed only by `force`).
 * @param layout - Layout strategy.
 * @param options - Optional force-layout tunables (ignored for non-force).
 * @returns Positioned nodes.
 */
export function layoutNodes(
  nodes: GraphNode[],
  edges: GraphEdge[],
  layout: GraphLayout,
  options?: ForceLayoutOptions,
): PositionedNode[] {
  switch (layout) {
    case 'circular':
      return circularLayout(nodes, Math.max(40, Math.sqrt(nodes.length) * 30))
    case 'grid':
      return gridLayout(nodes, 60)
    case 'force':
    default:
      return forceLayout(nodes, edges, options)
  }
}

/**
 * Compute the world-space bounding box of a set of positioned nodes,
 * with a small padding for visual breathing room.
 *
 * @param nodes - Positioned nodes.
 * @param padding - Padding (world units) added to every side. Default 40.
 * @returns Bounding box `{ minX, minY, maxX, maxY }` — or `null` if empty.
 */
export function boundingBox(
  nodes: PositionedNode[],
  padding = 40,
): { minX: number; minY: number; maxX: number; maxY: number } | null {
  if (nodes.length === 0) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const n of nodes) {
    if (n.x < minX) minX = n.x
    if (n.y < minY) minY = n.y
    if (n.x > maxX) maxX = n.x
    if (n.y > maxY) maxY = n.y
  }
  return { minX: minX - padding, minY: minY - padding, maxX: maxX + padding, maxY: maxY + padding }
}
