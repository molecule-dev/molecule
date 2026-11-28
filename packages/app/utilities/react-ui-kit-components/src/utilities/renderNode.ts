/**
 * React rendering for an input whose type is shared with other frameworks.
 *
 * @module
 */

import type { ReactNode } from 'react'

import { isReactNode } from './isReactNode.js'

/**
 * Reads the React node in a renderer-neutral prop.
 * @param value - The prop value.
 * @returns The node when React can render it.
 */
export function renderNode(value: unknown): ReactNode {
  return isReactNode(value) ? value : undefined
}
