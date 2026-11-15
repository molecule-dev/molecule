/**
 * `ChatPanel` cases.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** `ChatPanel`. */
export const chatPanelCases: FeatureComponentCases = {
  component: 'ChatPanel',
  cases: [
    {
      name: 'an empty conversation',
      props: { projectId: 'p1' },
      context: {
        areas: { chat: {} },
        http: [{ method: 'GET', url: '/projects/p1', data: { settings: {} } }],
      },
    },
  ],
}
