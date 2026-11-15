/**
 * `@molecule/app-section-divider-react` cases: the horizontal divider with an
 * optional centered label.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** `@molecule/app-section-divider-react`. */
export const sectionDividerFeature: FeatureCases = {
  package: '@molecule/app-section-divider-react',
  families: [
    {
      component: 'SectionDivider',
      cases: [
        { name: 'default, no label' },
        { name: 'center with a text label', children: ['OR'] },
        { name: 'explicit center alignment', props: { align: 'center' }, children: ['OR'] },
        { name: 'start alignment', props: { align: 'start' }, children: ['Today'] },
        { name: 'end alignment', props: { align: 'end' }, children: ['Today'] },
        { name: 'a node label', children: [{ tag: 'strong', children: ['12'] }] },
        { name: 'with a className', props: { className: 'parity-token' }, children: ['OR'] },
        {
          name: 'alignment changes',
          props: { align: 'center' },
          children: ['OR'],
          interactions: [
            { type: 'props', props: { align: 'start' } },
            { type: 'props', props: { align: 'end' } },
            { type: 'props', props: { align: 'center' } },
          ],
        },
        {
          name: 'className changes',
          props: { className: 'parity-token' },
          children: ['OR'],
          interactions: [{ type: 'props', props: { className: 'parity-other' } }],
        },
      ],
    },
  ],
}
