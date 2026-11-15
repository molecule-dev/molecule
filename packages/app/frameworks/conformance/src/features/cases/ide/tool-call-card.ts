/**
 * `ToolCallCard` cases.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** `ToolCallCard`. */
export const toolCallCardCases: FeatureComponentCases = {
  component: 'ToolCallCard',
  cases: [
    {
      name: 'a running read',
      props: { id: 't1', name: 'read_file', input: { path: 'src/index.ts' }, status: 'running' },
    },
  ],
}
