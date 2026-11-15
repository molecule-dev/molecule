/**
 * `CommandPalette` cases.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** `CommandPalette`. */
export const commandPaletteCases: FeatureComponentCases = {
  component: 'CommandPalette',
  cases: [{ name: 'no commands', props: { commands: [] }, callbacks: ['onDismiss'] }],
}
