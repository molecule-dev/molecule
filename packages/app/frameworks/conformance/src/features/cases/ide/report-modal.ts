/**
 * `ReportModal` cases.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** `ReportModal`. */
export const reportModalCases: FeatureComponentCases = {
  component: 'ReportModal',
  cases: [
    { name: 'an empty report', props: { projectId: 'p1' }, callbacks: ['onClose', 'onSubmitted'] },
  ],
}
