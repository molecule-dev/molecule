/**
 * `@molecule/app-shell-layout-react` cases: the header / main / footer frame.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const header = [{ tag: 'header', children: ['Acme'] }]
const footer = [{ tag: 'footer', children: ['© Acme'] }]

/** `@molecule/app-shell-layout-react`. */
export const shellLayoutFeature: FeatureCases = {
  package: '@molecule/app-shell-layout-react',
  families: [
    {
      component: 'AppShellLayout',
      cases: [
        { name: 'content only', children: ['Main content'] },
        {
          name: 'header, content and footer',
          slots: { header, footer },
          children: ['Main content'],
        },
        {
          name: 'narrow, with classes and an id',
          props: {
            maxWidth: 'md',
            className: 'parity-token',
            mainClassName: 'parity-main',
            dataMolId: 'shell',
          },
          slots: { header },
          children: ['Main content'],
        },
        { name: 'full width', props: { maxWidth: 'full' }, children: ['Main content'] },
        {
          name: 'width changes',
          props: { maxWidth: 'sm' },
          children: ['Main content'],
          interactions: [{ type: 'props', props: { maxWidth: 'lg' } }],
        },
      ],
    },
  ],
}
