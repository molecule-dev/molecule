/**
 * `EditorPanel` cases.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** `EditorPanel`. */
export const editorPanelCases: FeatureComponentCases = {
  component: 'EditorPanel',
  cases: [{ name: 'no open file', props: {}, context: { areas: { native: { editor: {} } } } }],
}
