/**
 * `@molecule/app-slide-thumbnail-react` cases: the fixed-width tile with an
 * index badge, an optional active outline and the caller's live preview as
 * children.
 *
 * Every branch is reachable from props: the aspect ratio (`16/9`, `4/3`,
 * `1/1`), the width, the active state, the children and the translated
 * aria-label, plus the click callback and react-prop changes.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** The live preview a caller passes as the tile's children. */
const preview = [
  {
    tag: 'div',
    attrs: { 'data-preview': '' },
    children: [{ tag: 'span', children: ['Title slide'] }],
  },
]

/** `@molecule/app-slide-thumbnail-react`. */
export const slideThumbnailFeature: FeatureCases = {
  package: '@molecule/app-slide-thumbnail-react',
  families: [
    {
      component: 'SlideThumbnail',
      cases: [
        { name: 'index only, with the default aspect and width', props: { index: 3 } },
        { name: 'live preview children', props: { index: 1 }, children: preview },
        { name: 'active slide', props: { index: 2, active: true } },
        { name: 'inactive slide', props: { index: 2, active: false } },
        {
          name: 'active slide with a live preview',
          props: { index: 4, active: true },
          children: preview,
        },
        { name: 'four-by-three aspect', props: { index: 1, aspect: '4/3' } },
        { name: 'square aspect', props: { index: 1, aspect: '1/1' } },
        { name: 'default aspect', props: { index: 1, aspect: '16/9' } },
        { name: 'custom width', props: { index: 1, width: 240 } },
        { name: 'zero width', props: { index: 1, width: 0 } },
        {
          name: 'class passthrough and id data',
          props: { index: 7, className: 'parity-token' },
        },
        {
          name: 'everything together',
          props: {
            index: 12,
            active: true,
            aspect: '4/3',
            width: 96,
            className: 'parity-token',
          },
          children: preview,
        },
        {
          name: 'click calls onClick',
          props: { index: 1 },
          callbacks: ['onClick'],
          interactions: [{ type: 'click', selector: 'button' }],
        },
        {
          name: 'click on the active tile calls onClick',
          props: { index: 2, active: true },
          children: preview,
          callbacks: ['onClick'],
          interactions: [{ type: 'click', selector: 'button' }],
        },
        {
          name: 'index and active change',
          props: { index: 1 },
          interactions: [{ type: 'props', props: { index: 4, active: true } }],
        },
        {
          name: 'width and aspect change',
          props: { index: 2 },
          interactions: [{ type: 'props', props: { width: 300, aspect: '1/1' } }],
        },
        {
          name: 'active tile becomes inactive',
          props: { index: 2, active: true },
          interactions: [{ type: 'props', props: { active: false } }],
        },
        {
          name: 'inactive tile becomes active',
          props: { index: 2, active: false },
          interactions: [{ type: 'props', props: { active: true } }],
        },
        {
          name: 'label follows a locale switch',
          props: { index: 5 },
          context: {
            translations: {
              'en-XA': { slideThumbnail: { label: 'Diapositive {{index}}' } },
            },
          },
          interactions: [{ type: 'locale', locale: 'en-XA' }],
        },
      ],
    },
  ],
}
