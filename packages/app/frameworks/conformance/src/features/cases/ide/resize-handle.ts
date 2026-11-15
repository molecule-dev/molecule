/**
 * `ResizeHandle` cases.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** `ResizeHandle`. */
export const resizeHandleCases: FeatureComponentCases = {
  component: 'ResizeHandle',
  cases: [{ name: 'a horizontal handle', props: {}, callbacks: ['onResize'] }],
}
