/**
 * `QuickPicker` cases.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** `QuickPicker`. */
export const quickPickerCases: FeatureComponentCases = {
  component: 'QuickPicker',
  cases: [{ name: 'no items', props: { items: [] }, callbacks: ['onSelect', 'onDismiss'] }],
}
