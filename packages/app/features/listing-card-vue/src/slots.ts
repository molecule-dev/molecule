/**
 * Slot helpers shared by the Vue listing-card components: node-valued props
 * arrive as a prop AND a same-named slot (Vue's idiom), so these resolve the
 * pair the way React's `children` / `{node && …}` conditions do.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

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
  if (slot) return slot()
  return prop != null && prop !== false ? [prop] : []
}

/**
 * Whether React would render a node prop: `node && …` renders nothing for
 * `null`, `undefined`, `false` and the empty string, and everything else.
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns True when the region renders.
 */
export const renders = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): boolean => (slot ? true : prop != null && prop !== false && prop !== '')
