/**
 * `SearchPanel` cases.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** `SearchPanel`. */
export const searchPanelCases: FeatureComponentCases = {
  component: 'SearchPanel',
  cases: [{ name: 'an empty search', props: { projectId: 'p1' } }],
}
