/**
 * `QuickOpen` cases.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** `QuickOpen`. */
export const quickOpenCases: FeatureComponentCases = {
  component: 'QuickOpen',
  cases: [
    {
      name: 'no files yet',
      props: { projectId: 'p1' },
      callbacks: ['onFileOpen', 'onDismiss'],
      context: { http: [{ method: 'GET', url: '/projects/p1/files-list', data: { files: [] } }] },
    },
  ],
}
