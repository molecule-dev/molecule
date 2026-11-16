/**
 * Small Vue node helpers shared by the Kanban components.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/**
 * Flattens a node-valued prop (a single node, an array of nodes, or nothing)
 * into the children list Vue renders — React renders `undefined` as nothing.
 *
 * @param value - The node(s), or nothing.
 * @returns The children to render.
 */
export function nodesOf(value: VNodeChild | null | undefined): VNodeChild[] {
  if (value === undefined || value === null || value === false) return []
  return Array.isArray(value) ? value : [value]
}

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * slot wins, and an absent pair contributes nothing.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children to render.
 */
export function slotOrProp(
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] {
  return slot ? slot() : nodesOf(prop)
}
