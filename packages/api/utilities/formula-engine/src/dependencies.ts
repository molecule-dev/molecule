/**
 * Dependency-graph helpers used by the Sheet engine for incremental
 * recompute and circular-reference detection.
 *
 * Pure functions — no I/O, no globals.
 *
 * @module
 */

import { coordKey, iterateRange } from './references.js'
import type { AstNode, CellCoord } from './types.js'

/**
 * Walk an AST and collect every coordinate it references (single
 * references and every cell inside ranges).
 *
 * @param node - Root AST node.
 * @returns Flat list of referenced coordinates (may contain duplicates).
 */
export function collectReferences(node: AstNode): CellCoord[] {
  const acc: CellCoord[] = []
  walk(node, acc)
  return acc
}

/**
 * Recursively walk an AST node and push every referenced coordinate into `acc`.
 */
function walk(node: AstNode, acc: CellCoord[]): void {
  switch (node.kind) {
    case 'reference':
      acc.push(node.coord)
      return
    case 'range':
      for (const c of iterateRange(node.range)) acc.push(c)
      return
    case 'unary':
      walk(node.operand, acc)
      return
    case 'binary':
      walk(node.left, acc)
      walk(node.right, acc)
      return
    case 'call':
      for (const a of node.args) walk(a, acc)
      return
    default:
      return
  }
}

/**
 * Topologically sort a set of coordinate keys by their dependency graph
 * such that, for any edge `a → b` (b depends on a), `a` precedes `b`
 * in the result.
 *
 * Uses Kahn's algorithm. If a cycle is detected, the cycle members are
 * returned in `cycle` and excluded from `order` — callers typically
 * mark cycle members with a `#CIRC!` error.
 *
 * @param dependents - Map from a key to the set of keys that depend on it.
 *   (i.e. forward edges in the recompute order.)
 * @param keys - Keys to sort.
 * @returns `{ order, cycle }` — `order` is the topological order;
 *   `cycle` is the set of keys participating in (or downstream of) a
 *   cycle.
 */
export function topologicalSort(
  dependents: ReadonlyMap<string, ReadonlySet<string>>,
  keys: ReadonlyArray<string>,
): { order: string[]; cycle: Set<string> } {
  const inDegree = new Map<string, number>()
  const set = new Set(keys)
  for (const k of set) inDegree.set(k, 0)
  for (const k of set) {
    const outs = dependents.get(k)
    if (!outs) continue
    for (const target of outs) {
      if (!set.has(target)) continue
      inDegree.set(target, (inDegree.get(target) ?? 0) + 1)
    }
  }
  const queue: string[] = []
  for (const [k, d] of inDegree) if (d === 0) queue.push(k)
  const order: string[] = []
  while (queue.length > 0) {
    const k = queue.shift()!
    order.push(k)
    const outs = dependents.get(k)
    if (!outs) continue
    for (const target of outs) {
      if (!set.has(target)) continue
      const next = (inDegree.get(target) ?? 0) - 1
      inDegree.set(target, next)
      if (next === 0) queue.push(target)
    }
  }
  const cycle = new Set<string>()
  for (const k of set) if (!order.includes(k)) cycle.add(k)
  return { order, cycle }
}

/**
 * Encode a coordinate to its canonical string key. Re-exported from
 * `references` for convenience.
 */
export { coordKey }
