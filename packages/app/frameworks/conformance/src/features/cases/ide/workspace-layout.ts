/**
 * `WorkspaceLayout` cases.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** `WorkspaceLayout`. */
export const workspaceLayoutCases: FeatureComponentCases = {
  component: 'WorkspaceLayout',
  cases: [
    {
      name: 'one child',
      props: {},
      children: ['workspace'],
      context: { areas: { native: { workspace: {} } } },
    },
  ],
}
