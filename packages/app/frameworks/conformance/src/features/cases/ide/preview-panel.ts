/**
 * `PreviewPanel` cases.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** `PreviewPanel`. */
export const previewPanelCases: FeatureComponentCases = {
  component: 'PreviewPanel',
  cases: [
    { name: 'the preview frame', props: {}, context: { areas: { native: { preview: {} } } } },
  ],
}
