/**
 * `@molecule/app-photo-lightbox-react` cases: the fullscreen viewer's open and
 * empty renders, the active photo, `initialIndex`, captions, alt-text
 * fallbacks, the prev/next arrows and "N / total" counter, the close button,
 * backdrop clicks, keyboard navigation (← → Esc), and the index reset when
 * `open` or `initialIndex` changes.
 *
 * `PhotoLightbox` is the package's only runtime export (`LightboxPhoto` and
 * `PhotoLightboxProps` are types). The kit Modal supplies the backdrop and the
 * close control. Its close button passes its click event to `onClose`, the
 * backdrop and Escape call it with no arguments, and a click on the dialog or
 * its content does not close; arrow navigation calls `onIndexChange` with the
 * clamped index. Captions are React nodes, so the case passes a node caption
 * as well as a plain string.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const photos = [
  { src: '/images/one.jpg', alt: 'First photo', caption: 'Caption one' },
  { src: '/images/two.jpg', alt: 'Second photo' },
  { src: '/images/three.jpg' },
]

const arrowRight = { type: 'keydown', selector: 'div[role="dialog"]', key: 'ArrowRight' } as const
const arrowLeft = { type: 'keydown', selector: 'div[role="dialog"]', key: 'ArrowLeft' } as const
const escape = { type: 'keydown', selector: 'div[role="dialog"]', key: 'Escape' } as const

/** `@molecule/app-photo-lightbox-react`. */
export const photoLightboxFeature: FeatureCases = {
  package: '@molecule/app-photo-lightbox-react',
  families: [
    {
      component: 'PhotoLightbox',
      cases: [
        { name: 'closed renders nothing', props: { photos, open: false } },
        { name: 'empty gallery renders nothing', props: { photos: [], open: true } },
        {
          name: 'defaults',
          props: { photos, open: true },
          callbacks: ['onClose', 'onIndexChange'],
        },
        {
          name: 'initialIndex 1',
          props: { photos, open: true, initialIndex: 1 },
          callbacks: ['onClose', 'onIndexChange'],
        },
        {
          name: 'initialIndex on the last photo',
          props: { photos, open: true, initialIndex: 2 },
          callbacks: ['onClose', 'onIndexChange'],
        },
        {
          name: 'single photo has no arrows',
          props: { photos: [photos[0]], open: true },
          callbacks: ['onClose', 'onIndexChange'],
        },
        {
          name: 'two photos',
          props: { photos: [photos[0], photos[1]], open: true },
          callbacks: ['onClose', 'onIndexChange'],
        },
        {
          name: 'photo without alt text',
          props: { photos: [{ src: '/images/plain.jpg' }], open: true },
          callbacks: ['onClose', 'onIndexChange'],
        },
        {
          name: 'active photo without a caption',
          props: { photos, open: true, initialIndex: 1 },
          callbacks: ['onClose', 'onIndexChange'],
        },
        {
          name: 'node caption',
          props: {
            photos: [
              {
                src: '/images/node.jpg',
                alt: 'Node photo',
                caption: { $nodes: [{ tag: 'strong', children: ['Bold caption'] }] },
              },
            ],
            open: true,
          },
          callbacks: ['onClose', 'onIndexChange'],
        },
        {
          name: 'next arrow advances and reports the index',
          props: { photos, open: true },
          callbacks: ['onClose', 'onIndexChange'],
          interactions: [{ type: 'click', selector: 'button[aria-label="Next"]' }],
        },
        {
          name: 'next arrow wraps from the last photo',
          props: { photos, open: true, initialIndex: 2 },
          callbacks: ['onClose', 'onIndexChange'],
          interactions: [{ type: 'click', selector: 'button[aria-label="Next"]' }],
        },
        {
          name: 'previous arrow wraps from the first photo',
          props: { photos, open: true },
          callbacks: ['onClose', 'onIndexChange'],
          interactions: [{ type: 'click', selector: 'button[aria-label="Previous"]' }],
        },
        {
          name: 'navigating without onIndexChange still moves',
          props: { photos, open: true },
          callbacks: ['onClose'],
          interactions: [{ type: 'click', selector: 'button[aria-label="Next"]' }],
        },
        {
          name: 'arrow navigation back and forth',
          props: { photos, open: true, initialIndex: 1 },
          callbacks: ['onClose', 'onIndexChange'],
          interactions: [
            { type: 'click', selector: 'button[aria-label="Next"]' },
            { type: 'click', selector: 'button[aria-label="Previous"]' },
            { type: 'click', selector: 'button[aria-label="Previous"]' },
          ],
        },
        {
          name: 'ArrowRight key advances',
          props: { photos, open: true },
          callbacks: ['onClose', 'onIndexChange'],
          interactions: [arrowRight],
        },
        {
          name: 'ArrowLeft key wraps',
          props: { photos, open: true },
          callbacks: ['onClose', 'onIndexChange'],
          interactions: [arrowLeft],
        },
        {
          name: 'ArrowLeft then ArrowRight',
          props: { photos, open: true, initialIndex: 1 },
          callbacks: ['onClose', 'onIndexChange'],
          interactions: [arrowLeft, arrowRight],
        },
        {
          name: 'Escape calls onClose',
          props: { photos, open: true },
          callbacks: ['onClose', 'onIndexChange'],
          interactions: [escape],
        },
        {
          name: 'other keys are ignored',
          props: { photos, open: true },
          callbacks: ['onClose', 'onIndexChange'],
          interactions: [{ type: 'keydown', selector: 'div[role="dialog"]', key: 'Enter' }],
        },
        {
          name: 'close button calls onClose with the event',
          props: { photos, open: true },
          callbacks: ['onClose', 'onIndexChange'],
          interactions: [{ type: 'click', selector: 'button[aria-label="Close"]' }],
        },
        {
          name: 'close button without onClose does not throw',
          props: { photos, open: true },
          callbacks: ['onIndexChange'],
          interactions: [{ type: 'click', selector: 'button[aria-label="Close"]' }],
        },
        {
          name: 'backdrop click calls onClose',
          props: { photos, open: true },
          callbacks: ['onClose', 'onIndexChange'],
          interactions: [{ type: 'click', selector: 'div[role="presentation"]' }],
        },
        {
          name: 'a click on the dialog itself does not close',
          props: { photos, open: true },
          callbacks: ['onClose', 'onIndexChange'],
          interactions: [{ type: 'click', selector: 'div[role="dialog"]' }],
        },
        {
          name: 'a click inside the figure does not close',
          props: { photos, open: true },
          callbacks: ['onClose', 'onIndexChange'],
          interactions: [
            { type: 'click', selector: 'figure' },
            { type: 'click', selector: 'img' },
          ],
        },
        {
          name: 'initialIndex change resets the active photo',
          props: { photos, open: true },
          callbacks: ['onClose', 'onIndexChange'],
          interactions: [
            { type: 'click', selector: 'button[aria-label="Next"]' },
            { type: 'props', props: { initialIndex: 2 } },
          ],
        },
        {
          name: 'closing and reopening resets the index',
          props: { photos, open: true },
          callbacks: ['onClose', 'onIndexChange'],
          interactions: [
            { type: 'click', selector: 'button[aria-label="Next"]' },
            { type: 'props', props: { open: false } },
            { type: 'props', props: { open: true } },
          ],
        },
        {
          name: 'opening from closed shows the initial photo',
          props: { photos, open: false, initialIndex: 1 },
          callbacks: ['onClose', 'onIndexChange'],
          interactions: [{ type: 'props', props: { open: true } }],
        },
        {
          name: 'replacing photos keeps the active index',
          props: { photos, open: true },
          callbacks: ['onClose', 'onIndexChange'],
          interactions: [
            { type: 'click', selector: 'button[aria-label="Next"]' },
            {
              type: 'props',
              props: { photos: photos.map((photo) => ({ ...photo })) },
            },
          ],
        },
        {
          name: 'caption added and removed on the active photo',
          props: { photos: [photos[1]], open: true },
          callbacks: ['onClose', 'onIndexChange'],
          interactions: [
            {
              type: 'props',
              props: { photos: [{ ...photos[1], caption: 'Added later' }] },
            },
            { type: 'props', props: { photos: [{ ...photos[1], caption: null }] } },
          ],
        },
        {
          name: 'emptying the gallery hides the lightbox',
          props: { photos, open: true },
          callbacks: ['onClose', 'onIndexChange'],
          interactions: [{ type: 'props', props: { photos: [] } }],
        },
        {
          name: 'translated labels follow a locale switch',
          props: { photos, open: true },
          callbacks: ['onClose', 'onIndexChange'],
          context: {
            translations: {
              fr: { lightbox: { close: 'Fermer', previous: 'Précédent', next: 'Suivant' } },
            },
          },
          interactions: [{ type: 'locale', locale: 'fr' }],
        },
        {
          name: 'everything at once',
          props: {
            photos,
            open: true,
            initialIndex: 1,
          },
          callbacks: ['onClose', 'onIndexChange'],
          interactions: [
            { type: 'keydown', selector: 'div[role="dialog"]', key: 'ArrowRight' },
            { type: 'click', selector: 'button[aria-label="Previous"]' },
            { type: 'click', selector: 'button[aria-label="Close"]' },
          ],
        },
      ],
    },
  ],
}
