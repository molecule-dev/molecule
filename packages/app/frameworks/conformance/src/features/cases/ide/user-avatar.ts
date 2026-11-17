/**
 * `UserAvatar` cases: the chat avatar's every branch — the real `<img>` for a
 * safe, renderable avatar (data-URI and http, whitespace-trimmed like
 * `resolveUserAvatar` trims), the generic-user-glyph fallback for an unsafe
 * value, the named author's initial tile (trimmed, with the raw label kept),
 * the whitespace-only name that keeps the glyph, a named author WITH a
 * renderable avatar, the `size` scaling (tile, initial and glyph), and the
 * interactive `onClick` branch — click, the hover and focus ring coming and
 * going, a callback added and removed after mount, and the locale switch that
 * re-translates the fallback label and the button's accessible name.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** A 1×1 transparent PNG data-URI — a safe, renderable avatar source. */
const DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

/** The interactive wrapper, present only with `onClick`. */
const BUTTON = '[data-mol-id="chat-user-avatar-button"]'

/** `UserAvatar`. */
export const userAvatarCases: FeatureComponentCases = {
  component: 'UserAvatar',
  cases: [
    {
      name: 'defaults render the generic user icon',
      props: {},
    },
    {
      name: 'a renderable data-URI avatar renders an img',
      props: { userAvatar: DATA_URI },
    },
    {
      name: 'an http avatar URL renders an img too',
      props: { userAvatar: 'https://cdn.example.com/me.png' },
    },
    {
      name: 'an avatar value with surrounding spaces renders trimmed',
      props: { userAvatar: `  ${DATA_URI}  ` },
    },
    {
      name: 'an unsafe scheme never becomes an img src',
      props: { userAvatar: 'javascript:alert(1)' },
    },
    {
      name: 'a name shows the initial instead of the glyph',
      props: { name: 'Ada Lovelace' },
    },
    {
      name: 'a name initials after trimming and keeps the raw label',
      props: { name: '  grace  ' },
    },
    {
      name: 'a whitespace-only name keeps the glyph',
      props: { name: '   ' },
    },
    {
      name: 'a named author with a renderable avatar shows their picture',
      props: { userAvatar: DATA_URI, name: 'Test' },
    },
    {
      name: 'a custom size sizes the tile and the initial',
      props: { size: 40, name: 'Bo' },
    },
    {
      name: 'a size scales the fallback glyph too',
      props: { size: 32 },
    },
    {
      name: 'clicking the avatar opens the profile',
      props: {},
      callbacks: ['onClick'],
      interactions: [{ type: 'click', selector: BUTTON }],
    },
    {
      name: 'the icon fallback is clickable too',
      props: { name: 'Tess' },
      callbacks: ['onClick'],
      interactions: [{ type: 'click', selector: BUTTON }],
    },
    {
      name: 'hover draws the ring until the pointer leaves',
      props: {},
      callbacks: ['onClick'],
      interactions: [
        { type: 'mouseenter', selector: BUTTON },
        { type: 'mouseleave', selector: BUTTON },
        { type: 'mouseenter', selector: BUTTON },
      ],
    },
    {
      name: 'keyboard focus draws the same ring',
      props: {},
      callbacks: ['onClick'],
      interactions: [
        { type: 'focus', selector: BUTTON },
        { type: 'blur', selector: BUTTON },
        { type: 'focus', selector: BUTTON },
      ],
    },
    {
      name: 'adding onClick re-renders the bare visual as a button',
      props: { userAvatar: DATA_URI },
      interactions: [
        { type: 'props', props: { onClick: { $callback: 'onClick' } } },
        { type: 'click', selector: BUTTON },
        { type: 'props', props: { onClick: undefined } },
      ],
    },
    {
      name: 'a locale switch translates the fallback label and the button label',
      props: {},
      callbacks: ['onClick'],
      context: {
        translations: {
          fr: { ide: { chat: { you: 'Vous', viewProfile: 'Voir le profil' } } },
        },
      },
      interactions: [
        { type: 'locale', locale: 'fr' },
        { type: 'click', selector: BUTTON },
      ],
    },
  ],
}
