/**
 * `@molecule/app-presence-indicator-react` cases: the status dot and the
 * avatar overlay.
 *
 * `PresenceDot` has no callback props — every branch is chosen by props alone
 * (status, size, position, corner, label, className), so the interactions
 * below change props. `AvatarWithPresence` adds the node child it decorates
 * and the conditional dot (present only while `status` is set).
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const avatar = [
  {
    tag: 'img',
    attrs: { src: '/avatar.png', alt: 'Ada', width: '40', height: '40' },
  },
]

/** `@molecule/app-presence-indicator-react`. */
export const presenceIndicatorFeature: FeatureCases = {
  package: '@molecule/app-presence-indicator-react',
  families: [
    {
      component: 'PresenceDot',
      cases: [
        { name: 'online default', props: { status: 'online' } },
        { name: 'away', props: { status: 'away' } },
        { name: 'busy', props: { status: 'busy' } },
        { name: 'offline', props: { status: 'offline' } },
        { name: 'custom aria label', props: { status: 'busy', ariaLabel: 'Do not disturb' } },
        { name: 'larger size', props: { status: 'online', size: 24 } },
        { name: 'explicit inline position', props: { status: 'online', position: 'inline' } },
        {
          name: 'corner is ignored inline',
          props: { status: 'online', corner: 'top-left' },
        },
        {
          name: 'overlay with the default corner',
          props: { status: 'online', position: 'overlay' },
        },
        {
          name: 'overlay at the top right',
          props: { status: 'away', position: 'overlay', corner: 'top-right' },
        },
        {
          name: 'overlay at the top left',
          props: { status: 'busy', position: 'overlay', corner: 'top-left' },
        },
        {
          name: 'overlay at the bottom left',
          props: { status: 'offline', position: 'overlay', corner: 'bottom-left' },
        },
        {
          name: 'classes and a custom label',
          props: { status: 'online', className: 'parity-token', ariaLabel: 'Online now' },
        },
        {
          name: 'status changes',
          props: { status: 'online' },
          interactions: [{ type: 'props', props: { status: 'busy' } }],
        },
        {
          name: 'position changes to overlay',
          props: { status: 'online' },
          interactions: [{ type: 'props', props: { position: 'overlay', corner: 'top-left' } }],
        },
        {
          name: 'size and label change',
          props: { status: 'away', size: 12 },
          interactions: [{ type: 'props', props: { size: 20, ariaLabel: 'Away' } }],
        },
      ],
    },
    {
      component: 'AvatarWithPresence',
      cases: [
        { name: 'children only, no dot', children: ['Main content'] },
        { name: 'online with a text child', props: { status: 'online' }, children: ['Ada'] },
        { name: 'online with an image child', props: { status: 'online' }, children: avatar },
        { name: 'no children, dot only', props: { status: 'offline' } },
        {
          name: 'away at the top left',
          props: { status: 'away', corner: 'top-left' },
          children: avatar,
        },
        {
          name: 'busy at the top right',
          props: { status: 'busy', corner: 'top-right' },
          children: avatar,
        },
        {
          name: 'offline at the bottom left',
          props: { status: 'offline', corner: 'bottom-left' },
          children: ['Ada'],
        },
        { name: 'sized dot', props: { status: 'online', dotSize: 16 }, children: avatar },
        {
          name: 'classes and a status',
          props: { status: 'online', className: 'parity-token' },
          children: ['Ada'],
        },
        {
          name: 'status appears',
          children: ['Ada'],
          interactions: [{ type: 'props', props: { status: 'busy' } }],
        },
        {
          name: 'status removed',
          props: { status: 'online' },
          children: ['Ada'],
          interactions: [{ type: 'props', props: { status: undefined } }],
        },
        {
          name: 'corner and dot size change',
          props: { status: 'online' },
          children: avatar,
          interactions: [{ type: 'props', props: { corner: 'top-left', dotSize: 8 } }],
        },
      ],
    },
  ],
}
