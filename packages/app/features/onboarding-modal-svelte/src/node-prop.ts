/**
 * Node-valued prop shape for the Svelte onboarding overlay.
 *
 * Internal to the package (not re-exported from the barrel): React's package
 * exposes no such helper type, so `types.js` re-exports only the props
 * interfaces and this shape stays implementation detail.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/**
 * A React-node-valued field: a snippet (the conformance kit's node value), or
 * plain text passed verbatim.
 */
export type ReactNodeProp = Snippet | string
