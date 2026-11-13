/**
 * Separator parity cases.
 *
 * @module
 */

import type { UIComponentCases } from '../../spec.js'

/** Separator: orientations and the decorative vs semantic (role=separator) modes. */
export const separatorCases: UIComponentCases = {
  component: 'Separator',
  cases: [
    { name: 'defaults horizontal decorative' },
    { name: 'vertical', props: { orientation: 'vertical' } },
    { name: 'explicit horizontal', props: { orientation: 'horizontal' } },
    { name: 'semantic horizontal', props: { decorative: false } },
    { name: 'semantic vertical', props: { decorative: false, orientation: 'vertical' } },
    {
      name: 'className, style and testId',
      props: { className: 'parity-token', style: { marginTop: '4px' }, testId: 'rule' },
    },
  ],
}
