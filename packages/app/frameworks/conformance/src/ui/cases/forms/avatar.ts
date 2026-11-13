/**
 * Avatar parity cases.
 *
 * @module
 */

import type { UIComponentCases } from '../../spec.js'

const AVATAR_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

/** Avatar: image vs fallback initials vs icon, sizes, square corners and custom fallback content. */
export const avatarCases: UIComponentCases = {
  component: 'Avatar',
  cases: [
    { name: 'defaults icon fallback' },
    { name: 'name initials', props: { name: 'Ada Lovelace' } },
    { name: 'three-part name initials', props: { name: 'Jean Pierre van Daele' } },
    { name: 'hyphenated name initials', props: { name: 'Anne-Marie' } },
    { name: 'email name initials', props: { name: 'grace.hopper@example.com' } },
    { name: 'single-part name', props: { name: 'Plato' } },
    { name: 'image with alt', props: { src: AVATAR_PNG, alt: 'Portrait of Ada' } },
    { name: 'image falls back to name alt', props: { src: AVATAR_PNG, name: 'Ada Lovelace' } },
    { name: 'image with default alt', props: { src: AVATAR_PNG } },
    {
      name: 'custom fallback content',
      slots: { fallback: [{ tag: 'strong', children: ['AB'] }] },
    },
    { name: 'square', props: { name: 'Ada Lovelace', rounded: false } },
    ...(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => ({
      name: `size ${size}`,
      props: { size },
    })),
    { name: 'numeric size', props: { size: 32, name: 'Ada Lovelace' } },
    { name: 'numeric size with image', props: { size: 24, src: AVATAR_PNG, alt: 'Tiny' } },
    {
      name: 'className, style and testId',
      props: {
        className: 'parity-token',
        style: { marginTop: '4px' },
        testId: 'who',
        name: 'Ada Lovelace',
      },
    },
    {
      name: 'image error falls back to name initials',
      props: { src: AVATAR_PNG, name: 'Ada Lovelace' },
      interactions: [{ type: 'event', selector: 'img', event: 'error' }],
    },
    {
      name: 'image error without a name uses the icon fallback',
      props: { src: AVATAR_PNG, alt: 'Portrait of Ada' },
      interactions: [{ type: 'event', selector: 'img', event: 'error' }],
    },
    {
      name: 'image error falls back to custom fallback content',
      props: { src: AVATAR_PNG },
      slots: { fallback: [{ tag: 'strong', children: ['AB'] }] },
      interactions: [{ type: 'event', selector: 'img', event: 'error' }],
    },
  ],
}
