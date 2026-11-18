/**
 * Node-valued prop shape for the Svelte data-table primitives.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/**
 * A React-node-valued prop: a snippet (a slot and node lists), or a plain
 * string passed verbatim.
 */
export type ReactNodeProp = Snippet | string
