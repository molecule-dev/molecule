/**
 * `TabBar` cases.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** `TabBar`. */
export const tabBarCases: FeatureComponentCases = {
  component: 'TabBar',
  cases: [
    { name: 'no tabs', props: { tabs: [], activeFile: null }, callbacks: ['onSelect', 'onClose'] },
  ],
}
