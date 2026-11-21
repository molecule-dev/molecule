/**
 * Internal render helpers for `@molecule/app-nav-chrome-vue`. Not exported
 * from the package barrel.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

/**
 * Resolves a node-valued prop that may also arrive as a same-named slot: the
 * slot wins; an absent pair contributes nothing (React renders nothing
 * either).
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The node children to render.
 */
export const slotOrProp = (
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] => (slot ? slot() : prop != null ? [prop] : [])

/**
 * Wraps an optional node value as a child list.
 *
 * @param value - The node value.
 * @returns The node as a list, or an empty list when absent.
 */
export const nodeList = (value: VNodeChild | null | undefined): VNodeChild[] =>
  value != null ? [value] : []
