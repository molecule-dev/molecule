/**
 * Node helpers shared by the Vue faceted-search primitives: how a node value
 * becomes VNode children. Not part of the package's public surface.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/**
 * The children a node value contributes: an array stays a list of siblings, a
 * single node is one child, and an absent value contributes nothing — the way
 * React renders `{node}`.
 *
 * @param value - A node value.
 * @returns The child nodes.
 */
export const childrenOf = (value: VNodeChild): VNodeChild[] => {
  if (value === null || value === undefined || value === false) return []
  return Array.isArray(value) ? value : [value]
}
