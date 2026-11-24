/**
 * Node-prop resolution for the Vue settings-page scaffold: every node-valued
 * React prop arrives here as a prop AND a same-named slot, and the two must
 * resolve to exactly what React renders.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

import { toChildArray } from '@molecule/app-vue'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: a
 * given prop wins (React's single source of truth — a later `null` removes the
 * node), and the slot is used only while the prop is absent. An absent pair
 * contributes nothing.
 *
 * @param prop - The prop value, when the caller passed the prop.
 * @param slot - The slot render function, when the caller passed the slot.
 * @returns The children to render.
 */
export const nodeValue = (
  prop: VNodeChild,
  slot: (() => VNodeChild[]) | undefined,
): VNodeChild[] => {
  if (prop !== undefined) return prop === null ? [] : [prop]
  if (slot) return slot()
  return []
}

/**
 * Whether a node-valued prop or its same-named slot would render anything —
 * React's `{node && …}` branch condition.
 *
 * @param prop - The prop value.
 * @param slot - The slot render function, when provided.
 * @returns True when the node renders.
 */
export const hasNode = (prop: VNodeChild, slot: (() => VNodeChild[]) | undefined): boolean =>
  toChildArray(nodeValue(prop, slot)).length > 0
