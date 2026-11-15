/**
 * `ShareModal` cases.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** `ShareModal`. */
export const shareModalCases: FeatureComponentCases = {
  component: 'ShareModal',
  cases: [
    {
      name: 'the share dialog',
      props: { projectId: 'p1' },
      callbacks: ['onClose'],
      context: { http: [{ method: 'GET', url: '/projects/p1/shares', data: [] }] },
    },
  ],
}
