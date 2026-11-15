/**
 * `@molecule/app-announcement-bar-react` cases: the message, the leading icon,
 * the action (a link when it has an `href`, a button otherwise), every `kind`,
 * the dismiss button and the two ways visibility is controlled (internal state
 * or the `visible` prop).
 *
 * `AnnouncementBar` is the package's only runtime export. `onDismiss` takes no
 * arguments, so its recorded call is empty; the action's `onClick` receives
 * React's click event, so it is passed the event in every framework.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const icon = [{ tag: 'span', attrs: { 'data-icon': '' }, children: ['🎉'] }]
const boldMessage = [{ tag: 'strong', children: ['Bold message'] }]
const linkLabel = { $nodes: [{ tag: 'em', children: ['Learn more'] }] }
const actionClick = { $callback: 'actionClick' }

/** The dismiss button, selected structurally: the second row's last button. */
const dismissSelector = 'div[role="status"] > div:nth-child(2) > button[aria-label="Dismiss"]'
/** The action button, selected structurally: the second row's first button. */
const actionButtonSelector = 'div[role="status"] > div:nth-child(2) > button:first-child'

/** `@molecule/app-announcement-bar-react`. */
export const announcementBarFeature: FeatureCases = {
  package: '@molecule/app-announcement-bar-react',
  families: [
    {
      component: 'AnnouncementBar',
      cases: [
        { name: 'defaults', children: ['New feature!'] },
        { name: 'kind info', children: ['X'], props: { kind: 'info' } },
        { name: 'kind success', children: ['X'], props: { kind: 'success' } },
        { name: 'kind warning', children: ['X'], props: { kind: 'warning' } },
        { name: 'kind error', children: ['X'], props: { kind: 'error' } },
        { name: 'kind promo', children: ['X'], props: { kind: 'promo' } },
        { name: 'an icon slot', children: ['X'], slots: { icon } },
        { name: 'an icon prop', children: ['X'], props: { icon: { $nodes: icon } } },
        { name: 'node children', children: boldMessage },
        { name: 'empty children', children: [] },
        {
          name: 'an action as a link',
          children: ['X'],
          props: { action: { label: linkLabel, href: '/pricing' } },
        },
        {
          name: 'an action as a plain-string label button',
          children: ['X'],
          props: { action: { label: 'Do it' } },
        },
        {
          name: 'an action button calls onClick with the event',
          children: ['X'],
          props: { action: { label: 'Do it', onClick: actionClick } },
          interactions: [{ type: 'click', selector: actionButtonSelector }],
        },
        {
          name: 'an action with an href renders a link and ignores onClick',
          children: ['X'],
          props: { action: { label: 'Go', href: '/go', onClick: actionClick } },
          interactions: [{ type: 'click', selector: 'a[href="/go"]' }],
        },
        {
          name: 'dismissible false renders no dismiss button',
          children: ['X'],
          props: { dismissible: false },
        },
        {
          name: 'dismissible false with an action renders only the action',
          children: ['X'],
          props: { dismissible: false, action: { label: 'Do it' } },
        },
        {
          name: 'controlled visible false renders nothing',
          children: ['X'],
          props: { visible: false },
        },
        {
          name: 'controlled visible true renders the bar',
          children: ['X'],
          props: { visible: true },
        },
        {
          name: 'dismissing hides the bar and calls onDismiss',
          children: ['X'],
          callbacks: ['onDismiss'],
          interactions: [{ type: 'click', selector: dismissSelector }],
        },
        {
          name: 'dismissing without onDismiss still hides the bar',
          children: ['X'],
          interactions: [{ type: 'click', selector: dismissSelector }],
        },
        {
          name: 'dismissing a controlled bar keeps it visible but calls onDismiss',
          children: ['X'],
          props: { visible: true },
          callbacks: ['onDismiss'],
          interactions: [{ type: 'click', selector: dismissSelector }],
        },
        {
          name: 'dismissing a controlled bar twice calls onDismiss twice',
          children: ['X'],
          props: { visible: true },
          callbacks: ['onDismiss'],
          interactions: [
            { type: 'click', selector: dismissSelector },
            { type: 'click', selector: dismissSelector },
          ],
        },
        {
          name: 'dataMolId and className passthrough',
          children: ['X'],
          props: { dataMolId: 'ann-x', className: 'parity-token' },
        },
        {
          name: 'everything at once',
          children: ['Big news'],
          props: {
            kind: 'warning',
            dataMolId: 'ann-all',
            className: 'parity-token',
            action: { label: 'Read', href: '/read' },
          },
          slots: { icon },
        },
        {
          name: 'prop changes',
          children: ['X'],
          interactions: [
            {
              type: 'props',
              props: { kind: 'error', className: 'parity-token', dataMolId: 'ann' },
            },
            { type: 'props', props: { visible: false } },
            { type: 'props', props: { visible: true, kind: 'success' } },
          ],
        },
        {
          name: 'a dismissed bar is shown again by a controlled visible prop',
          children: ['X'],
          callbacks: ['onDismiss'],
          interactions: [
            { type: 'click', selector: dismissSelector },
            { type: 'props', props: { visible: true } },
          ],
        },
        {
          name: 'an action added after mount renders it',
          children: ['X'],
          interactions: [{ type: 'props', props: { action: { label: 'Later' } } }],
        },
        {
          name: 'removing the icon and action after mount',
          children: ['X'],
          props: { action: { label: 'Do it' }, icon: { $nodes: icon } },
          interactions: [{ type: 'props', props: { icon: null, action: null } }],
        },
      ],
    },
  ],
}
