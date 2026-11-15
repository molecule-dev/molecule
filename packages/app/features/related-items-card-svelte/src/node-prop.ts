/**
 * Node-valued prop shape for the Svelte related-items card.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/**
 * A React-node-valued prop: a snippet (slot and node lists), or a plain
 * string passed verbatim.
 */
export type ReactNodeProp = Snippet | string
