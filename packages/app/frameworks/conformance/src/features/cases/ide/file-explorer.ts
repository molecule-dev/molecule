/**
 * `FileExplorer` cases.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** `FileExplorer`. */
export const fileExplorerCases: FeatureComponentCases = {
  component: 'FileExplorer',
  cases: [{ name: 'an empty tree', props: { files: [] }, callbacks: ['onFileSelect'] }],
}
