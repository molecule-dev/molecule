/**
 * Slot helpers shared by the Vue listing-card components: node-valued props
 * arrive as a prop AND a same-named slot (Vue's idiom), so these resolve the
 * pair the way React's `children` / `{node && …}` conditions do.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

import { toChildArray } from '@molecule/app-vue'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * slot wins, and an absent pair contributes nothing.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children to render.
 */
export const slotOrProp = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => {
  // An empty list renders nothing, as React's slot() treats it.
  if (slot) return toChildArray(slot())
  return prop != null && prop !== false ? toChildArray(prop) : []
}
