/**
 * Shared helpers of `@molecule/app-legal-pages-vue`: the HTML escaper the
 * bonded legal content interpolates through, and the prop-or-slot resolver the
 * node-valued props use.
 *
 * @module
 */

import type { VNodeChild } from 'vue'

import { toChildArray } from '@molecule/app-vue'

/**
 * HTML-escapes an interpolation value before it enters a translation whose
 * result is rendered as HTML (`innerHTML`). Vue escapes text children
 * automatically but NOT values interpolated into HTML strings — an `appName`
 * containing markup would otherwise execute inside the legal content.
 *
 * @param value - The raw interpolation value.
 * @returns The escaped value, safe to interpolate into an HTML string.
 */
export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/**
 * Resolves a node-valued prop that may arrive as a prop, as a same-named slot,
 * or both: the slot wins, and neither contributes nothing. `null` contributes
 * nothing (React renders `{null}` the same way).
 *
 * @param slot - The slot render function, when the caller passed the slot.
 * @param prop - The prop value, when the caller passed the prop.
 * @returns The children to render.
 */
export function nodeOrSlot(
  slot: (() => VNodeChild[]) | undefined,
  prop: VNodeChild | null | undefined,
): VNodeChild[] {
  if (slot) return toChildArray(slot())
  return prop !== undefined && prop !== null ? toChildArray(prop) : []
}

/**
 * Whether a resolved node list renders anything (React's `{value ? … : null}`
 * truthiness, applied to the nodes the frameworks hand over).
 *
 * @param nodes - The resolved children.
 * @returns True when at least one child renders.
 */
export function hasNodes(nodes: VNodeChild[]): boolean {
  return nodes.length > 0
}
