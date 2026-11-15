/**
 * Node-valued prop shape for the Svelte settings actions bar.
 *
 * Internal to the package (not re-exported from the barrel): React's package
 * exposes no such helper type, so the public `types.js` module re-exports only
 * the props interfaces and this shape stays implementation detail.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/**
 * A React-node-valued prop: a snippet (slot and node lists), or a plain
 * string passed verbatim.
 */
export type ReactNodeProp = Snippet | string
