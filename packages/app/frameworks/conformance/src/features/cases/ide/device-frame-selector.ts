/**
 * `DeviceFrameSelector` cases.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** `DeviceFrameSelector`. */
export const deviceFrameSelectorCases: FeatureComponentCases = {
  component: 'DeviceFrameSelector',
  cases: [{ name: 'desktop selected', props: { current: 'desktop' }, callbacks: ['onChange'] }],
}
