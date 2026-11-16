/**
 * Icon parity cases.
 *
 * @module
 */

import type { CaseA11y, UIComponentCases } from '../../spec.js'

/** The case opts the icon into the accessibility tree with role img but gives it no label. */
const UNNAMED_IMG: CaseA11y = {
  expect: ['svg-img-alt'],
  reason: 'The case opts the icon into the accessibility tree with role img but gives it no label',
}

/** Icon: named glyphs, sizes, svg-backed glyphs, accessibility opt-ins and event forwarding. */
export const iconCases: UIComponentCases = {
  component: 'Icon',
  cases: [
    { name: 'defaults', props: { name: 'user' } },
    ...(['search', 'mail', 'star', 'chevron-down', 'x-mark'] as const).map((name) => ({
      name: `glyph ${name}`,
      props: { name },
    })),
    { name: 'svg-backed glyph', props: { name: 'logo-mark' } },
    { name: 'size 16', props: { name: 'user', size: 16 } },
    { name: 'size 32', props: { name: 'user', size: 32 } },
    { name: 'className', props: { name: 'user', className: 'parity-token' } },
    {
      name: 'aria label opts into the a11y tree',
      props: { name: 'trash', 'aria-label': 'Delete item' },
    },
    {
      name: 'role img opts into the a11y tree',
      a11y: UNNAMED_IMG,
      props: { name: 'star', role: 'img' },
    },
    {
      name: 'explicit aria-hidden false',
      props: { name: 'star', 'aria-label': 'Favorite', 'aria-hidden': false },
    },
    {
      name: 'data and id passthrough',
      props: { name: 'gear', 'data-mol-id': 'settings-icon', id: 'gear-icon' },
    },
    {
      name: 'size changes on re-render',
      props: { name: 'user' },
      interactions: [{ type: 'props', props: { size: 32 } }],
    },
    {
      name: 'click on the svg fires onClick',
      props: { name: 'user' },
      callbacks: ['onClick'],
      interactions: [{ type: 'click', selector: 'svg' }],
    },
  ],
}
