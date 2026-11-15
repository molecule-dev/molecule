/**
 * `ShareLinkManager` cases.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** `ShareLinkManager`. */
export const shareLinkManagerCases: FeatureComponentCases = {
  component: 'ShareLinkManager',
  cases: [
    {
      name: 'no links yet',
      props: { projectId: 'p1' },
      context: { http: [{ method: 'GET', url: '/projects/p1/shares', data: [] }] },
    },
  ],
}
