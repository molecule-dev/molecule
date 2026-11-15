/**
 * `@molecule/app-image-gallery-react` cases: the main image + thumbnail grid
 * gallery, its controlled/uncontrolled selection, the `maxThumbnails`
 * summarisation and its "+N" overflow chip.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const images = ['/a.jpg', '/b.jpg', '/c.jpg', '/d.jpg', '/e.jpg', '/f.jpg']

/** `n` images named `/img-0.jpg` … for the wrap and snap cases. */
const many = (n: number): string[] =>
  Array.from({ length: n }, (_value, index) => `/img-${index}.jpg`)

/** `@molecule/app-image-gallery-react`. */
export const imageGalleryFeature: FeatureCases = {
  package: '@molecule/app-image-gallery-react',
  families: [
    {
      component: 'ImageGallery',
      cases: [
        { name: 'defaults', props: { images: ['/only.jpg'] } },
        { name: 'no images', props: { images: [] } },
        { name: 'two images', props: { images: images.slice(0, 2) } },
        {
          name: 'more images than the default max thumbnails',
          props: { images },
        },
        {
          name: 'exactly the default max thumbnails',
          props: { images: images.slice(0, 4) },
        },
        {
          name: 'alt text supplied for every image',
          props: {
            images: images.slice(0, 3),
            alts: ['First photo', 'Second photo', 'Third photo'],
          },
        },
        {
          name: 'alt text supplied for only the first image',
          props: { images: images.slice(0, 3), alts: ['First photo'] },
        },
        {
          name: 'extra classes',
          props: { images: images.slice(0, 2), className: 'parity-token' },
        },
        {
          name: 'controlled selected index',
          props: { images: images.slice(0, 3), selectedIndex: 2 },
        },
        {
          name: 'selected index beyond the last image',
          props: { images: images.slice(0, 2), selectedIndex: 5 },
        },
        {
          name: 'max thumbnails one',
          props: { images: images.slice(0, 3), maxThumbnails: 1 },
        },
        {
          name: 'max thumbnails two',
          props: { images: images.slice(0, 3), maxThumbnails: 2 },
        },
        {
          name: 'max thumbnails three',
          props: { images: images.slice(0, 3), maxThumbnails: 3 },
        },
        {
          name: 'max thumbnails five',
          props: { images: many(7), maxThumbnails: 5 },
        },
        {
          name: 'max thumbnails six',
          props: { images: many(8), maxThumbnails: 6 },
        },
        {
          name: 'max thumbnails twelve',
          props: { images: many(14), maxThumbnails: 12 },
        },
        {
          name: 'unsupported max thumbnails snaps to six columns',
          props: { images: many(8), maxThumbnails: 8 },
        },
        {
          name: 'very large max thumbnails snaps to twelve columns',
          props: { images: many(20), maxThumbnails: 20 },
        },
        {
          name: 'zero max thumbnails snaps to one column',
          props: { images: images.slice(0, 3), maxThumbnails: 0 },
        },
        {
          name: 'negative max thumbnails drops the last thumbnails',
          props: { images: images.slice(0, 4), maxThumbnails: -2 },
        },
        {
          name: 'fractional max thumbnails snaps down',
          props: { images: many(5), maxThumbnails: 3.7 },
        },
        {
          name: 'click a thumbnail in an uncontrolled gallery',
          props: { images: images.slice(0, 3) },
          callbacks: ['onSelect'],
          interactions: [
            { type: 'click', selector: 'button:nth-of-type(2)' },
            { type: 'click', selector: 'button:nth-of-type(3)' },
            { type: 'click', selector: 'button:nth-of-type(1)' },
          ],
        },
        {
          name: 'click a thumbnail without a select callback',
          props: { images: images.slice(0, 3) },
          interactions: [{ type: 'click', selector: 'button:nth-of-type(2)' }],
        },
        {
          name: 'controlled click reports the index and keeps the selection',
          props: { images: images.slice(0, 3), selectedIndex: 0 },
          callbacks: ['onSelect'],
          interactions: [
            { type: 'click', selector: 'button:nth-of-type(3)' },
            { type: 'click', selector: 'button:nth-of-type(2)' },
          ],
        },
        {
          name: 'controlled selection changes',
          props: { images: images.slice(0, 3), selectedIndex: 0 },
          interactions: [{ type: 'props', props: { selectedIndex: 2 } }],
        },
        {
          name: 'becomes controlled after a click',
          props: { images: images.slice(0, 3) },
          callbacks: ['onSelect'],
          interactions: [
            { type: 'click', selector: 'button:nth-of-type(2)' },
            { type: 'props', props: { selectedIndex: 2 } },
          ],
        },
        {
          name: 'max thumbnails changes',
          props: { images, maxThumbnails: 4 },
          interactions: [{ type: 'props', props: { maxThumbnails: 2 } }],
        },
        {
          name: 'max thumbnails reset to the default',
          props: { images, maxThumbnails: 2 },
          interactions: [{ type: 'props', props: { maxThumbnails: undefined } }],
        },
        {
          name: 'images change',
          props: { images: images.slice(0, 3) },
          interactions: [{ type: 'props', props: { images: ['/x.jpg', '/y.jpg'] } }],
        },
        {
          name: 'images grow',
          props: { images: images.slice(0, 2) },
          interactions: [{ type: 'props', props: { images } }],
        },
        {
          name: 'images shrink below the selected index',
          props: { images: images.slice(0, 3), selectedIndex: 2 },
          interactions: [{ type: 'props', props: { images: images.slice(0, 2) } }],
        },
        {
          name: 'images become empty',
          props: { images: images.slice(0, 3) },
          interactions: [{ type: 'props', props: { images: [] } }],
        },
        {
          name: 'alt text changes',
          props: { images: images.slice(0, 3), alts: ['First photo'] },
          interactions: [{ type: 'props', props: { alts: ['One', 'Two', 'Three'] } }],
        },
        {
          name: 'every prop, then a click',
          props: {
            images,
            selectedIndex: 2,
            maxThumbnails: 3,
            alts: ['One', 'Two', 'Three', 'Four', 'Five', 'Six'],
            className: 'all-props',
          },
          callbacks: ['onSelect'],
          interactions: [{ type: 'click', selector: 'button:nth-of-type(1)' }],
        },
      ],
    },
  ],
}
