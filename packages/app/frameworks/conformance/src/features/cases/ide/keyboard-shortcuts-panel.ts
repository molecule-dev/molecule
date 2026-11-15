/**
 * `KeyboardShortcutsPanel` cases.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** `KeyboardShortcutsPanel`. */
export const keyboardShortcutsPanelCases: FeatureComponentCases = {
  component: 'KeyboardShortcutsPanel',
  cases: [{ name: 'no shortcuts', props: { shortcuts: [] }, callbacks: ['onDismiss'] }],
}
