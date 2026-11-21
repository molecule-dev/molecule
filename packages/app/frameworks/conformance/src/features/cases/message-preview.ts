/**
 * `@molecule/app-message-preview-react` cases: one conversation / thread row —
 * initials avatar with presence dot, name + preview + timestamp + unread pip,
 * the active-selection treatment, the optional Material Symbols channel glyph,
 * the click callback, and the router `<Link>` form when `to` is given.
 *
 * `MessagePreview` is the package's only runtime export. `name`, `preview` and
 * `timestamp` are node props (a string renders as text, an element as a node);
 * `onClick` receives React's click event, so it is passed the event in every
 * framework.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/**
 * The row's root in its clickable form: React puts `role="button"` on it when
 * `onClick` is given, and every framework does the same. (A positional
 * `[data-parity-unwrap] > div` selector would hit each adapter's own mount
 * wrapper rather than the row.)
 */
const clickableRowSelector = '[role="button"]'
/** The router-link form's root anchor. */
const linkSelector = 'a'

const nameNode = [{ tag: 'strong', children: ['Maya Patel'] }]
const previewNode = [{ tag: 'em', children: ['Thanks! That fixed it.'] }]
const timestampNode = [{ tag: 'time', children: ['10:42'] }]

/** `@molecule/app-message-preview-react`. */
export const messagePreviewFeature: FeatureCases = {
  package: '@molecule/app-message-preview-react',
  families: [
    {
      component: 'MessagePreview',
      cases: [
        // The first case also runs again with a pseudo-locale switch
        // ("…, then a locale switch").
        {
          name: 'name, preview and timestamp',
          props: { name: 'Maya Patel', preview: 'Thanks! That fixed it.', timestamp: '2m' },
        },
        {
          name: 'single-word name derives one initial',
          props: { name: 'Maya', preview: 'On my way', timestamp: '1m' },
        },
        {
          name: 'initials override the derived ones',
          props: { name: 'Maya Patel', preview: 'Thanks!', timestamp: '2m', initials: 'MP' },
        },
        {
          name: 'node name, preview and timestamp',
          slots: { name: nameNode, preview: previewNode, timestamp: timestampNode },
        },
        {
          name: 'unread pip and a bold name',
          props: { name: 'Maya Patel', preview: 'Thanks!', timestamp: '2m', unread: 3 },
        },
        {
          name: 'zero unread hides the pip',
          props: { name: 'Maya Patel', preview: 'Thanks!', timestamp: '2m', unread: 0 },
        },
        {
          name: 'negative unread hides the pip',
          props: { name: 'Maya Patel', preview: 'Thanks!', timestamp: '2m', unread: -1 },
        },
        {
          name: 'custom unread label',
          props: {
            name: 'Maya Patel',
            preview: 'Thanks!',
            timestamp: '2m',
            unread: 5,
            unreadAriaLabel: '5 new messages',
          },
        },
        {
          name: 'online presence',
          props: { name: 'Maya Patel', preview: 'Thanks!', timestamp: '2m', presence: 'online' },
        },
        {
          name: 'away presence',
          props: { name: 'Maya Patel', preview: 'Thanks!', timestamp: '2m', presence: 'away' },
        },
        {
          name: 'offline presence',
          props: { name: 'Maya Patel', preview: 'Thanks!', timestamp: '2m', presence: 'offline' },
        },
        {
          name: 'null presence hides the dot',
          props: { name: 'Maya Patel', preview: 'Thanks!', timestamp: '2m', presence: null },
        },
        {
          name: 'active selection',
          props: { name: 'Maya Patel', preview: 'Thanks!', timestamp: '2m', active: true },
        },
        {
          name: 'inactive row',
          props: { name: 'Maya Patel', preview: 'Thanks!', timestamp: '2m', active: false },
        },
        {
          name: 'channel icon',
          props: {
            name: 'Maya Patel',
            preview: 'Thanks!',
            timestamp: '2m',
            channelIcon: 'mail',
          },
        },
        {
          name: 'className passthrough',
          props: {
            name: 'Maya Patel',
            preview: 'Thanks!',
            timestamp: '2m',
            className: 'parity-token',
          },
        },
        {
          name: 'everything at once',
          props: {
            name: 'Maya Patel',
            preview: 'Thanks! That fixed it.',
            timestamp: '2m',
            unread: 2,
            presence: 'online',
            active: true,
            channelIcon: 'chat',
            className: 'parity-token',
          },
        },
        {
          name: 'router link',
          props: {
            name: 'Maya Patel',
            preview: 'Thanks!',
            timestamp: '2m',
            to: '/conversation/t1',
          },
          context: { route: '/' },
        },
        {
          name: 'clicking the link calls onClick and navigates',
          props: {
            name: 'Maya Patel',
            preview: 'Thanks!',
            timestamp: '2m',
            to: '/conversation/t1',
          },
          context: { route: '/' },
          callbacks: ['onClick'],
          interactions: [{ type: 'click', selector: linkSelector }],
        },
        {
          // A new-tab, new-window or download click is the browser's, as with react-router's Link.
          name: 'modified clicks on the link are left to the browser',
          props: {
            name: 'Maya Patel',
            preview: 'Thanks!',
            timestamp: '2m',
            to: '/conversation/t1',
          },
          context: { route: '/' },
          interactions: [
            { type: 'click', selector: linkSelector, modifiers: { ctrlKey: true } },
            { type: 'click', selector: linkSelector, modifiers: { metaKey: true } },
            { type: 'click', selector: linkSelector, modifiers: { shiftKey: true } },
            { type: 'click', selector: linkSelector, modifiers: { altKey: true } },
          ],
        },
        {
          name: 'clicking the row calls onClick',
          props: { name: 'Maya Patel', preview: 'Thanks!', timestamp: '2m' },
          callbacks: ['onClick'],
          interactions: [{ type: 'click', selector: clickableRowSelector }],
        },
        {
          name: 'enter key activates the row',
          props: { name: 'Maya Patel', preview: 'Thanks!', timestamp: '2m' },
          callbacks: ['onClick'],
          interactions: [{ type: 'keydown', selector: clickableRowSelector, key: 'Enter' }],
        },
        {
          name: 'space key activates the row',
          props: { name: 'Maya Patel', preview: 'Thanks!', timestamp: '2m' },
          callbacks: ['onClick'],
          interactions: [{ type: 'keydown', selector: clickableRowSelector, key: ' ' }],
        },
        {
          name: 'other keys are ignored',
          props: { name: 'Maya Patel', preview: 'Thanks!', timestamp: '2m' },
          callbacks: ['onClick'],
          interactions: [
            { type: 'keydown', selector: clickableRowSelector, key: 'a' },
            { type: 'keydown', selector: clickableRowSelector, key: 'Tab' },
          ],
        },
        {
          name: 'the row is not clickable without onClick',
          props: { name: 'Maya Patel', preview: 'Thanks!', timestamp: '2m' },
          interactions: [{ type: 'click', selector: 'p' }],
        },
        {
          name: 'the row becomes active',
          props: { name: 'Maya Patel', preview: 'Thanks!', timestamp: '2m', active: false },
          interactions: [{ type: 'props', props: { active: true } }],
        },
        {
          name: 'an unread count appears',
          props: { name: 'Maya Patel', preview: 'Thanks!', timestamp: '2m', unread: 0 },
          interactions: [{ type: 'props', props: { unread: 2 } }],
        },
        {
          name: 'the presence dot appears',
          props: { name: 'Maya Patel', preview: 'Thanks!', timestamp: '2m' },
          interactions: [{ type: 'props', props: { presence: 'online' } }],
        },
        {
          name: 'the row becomes a link',
          props: { name: 'Maya Patel', preview: 'Thanks!', timestamp: '2m' },
          context: { route: '/' },
          interactions: [{ type: 'props', props: { to: '/conversation/t1' } }],
        },
        {
          name: 'the link target changes',
          props: {
            name: 'Maya Patel',
            preview: 'Thanks!',
            timestamp: '2m',
            to: '/conversation/t1',
          },
          context: { route: '/' },
          interactions: [{ type: 'props', props: { to: '/conversation/t2' } }],
        },
        {
          name: 'preview and timestamp change',
          props: { name: 'Maya Patel', preview: 'Thanks!', timestamp: '2m' },
          interactions: [{ type: 'props', props: { preview: 'See you then', timestamp: '1h' } }],
        },
        {
          name: 'an initials override appears',
          props: { name: 'Maya Patel', preview: 'Thanks!', timestamp: '2m' },
          interactions: [{ type: 'props', props: { initials: 'ZZ' } }],
        },
      ],
    },
  ],
}
