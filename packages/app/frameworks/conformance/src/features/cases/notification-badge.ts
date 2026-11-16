/**
 * `@molecule/app-notification-badge-react` cases: the count pill, the presence
 * dot and the positioned wrapper.
 *
 * None of the three reads a service, holds state or takes a callback: every
 * branch is chosen by props alone, and the interactions below change them so
 * the snapshots show the re-rendered DOM. The conditional renders are part of
 * the contract — the badge and the dot render nothing at all when hidden
 * (`hideOnZero` / `visible`), and the wrapper keeps its child either way.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** `@molecule/app-notification-badge-react`. */
export const notificationBadgeFeature: FeatureCases = {
  package: '@molecule/app-notification-badge-react',
  families: [
    {
      component: 'NotificationBadge',
      cases: [
        { name: 'renders the count', props: { count: 5 } },
        { name: 'renders nothing when count is 0', props: { count: 0 } },
        { name: 'renders nothing for a negative count', props: { count: -3 } },
        {
          name: 'renders a 0 badge when hideOnZero is false',
          props: { count: 0, hideOnZero: false },
        },
        {
          name: 'renders a negative count when hideOnZero is false',
          props: { count: -3, hideOnZero: false },
        },
        { name: 'clamps to 99+ by default', props: { count: 250 } },
        { name: 'honours a custom max', props: { count: 12, max: 9 } },
        { name: 'shows the raw count at the max', props: { count: 99 } },
        { name: 'error variant by default', props: { count: 1 } },
        { name: 'error variant', props: { count: 1, variant: 'error' } },
        { name: 'warning variant', props: { count: 1, variant: 'warning' } },
        { name: 'info variant', props: { count: 1, variant: 'info' } },
        { name: 'success variant', props: { count: 1, variant: 'success' } },
        { name: 'neutral variant', props: { count: 1, variant: 'neutral' } },
        { name: 'forwards className', props: { count: 1, className: 'badge-cls' } },
        {
          name: 'count changes',
          props: { count: 5 },
          interactions: [{ type: 'props', props: { count: 120 } }],
        },
        {
          name: 'variant changes',
          props: { count: 2, variant: 'error' },
          interactions: [{ type: 'props', props: { variant: 'success' } }],
        },
        {
          name: 'hides on a count of 0 and shows again',
          props: { count: 4 },
          interactions: [
            { type: 'props', props: { count: 0 } },
            { type: 'props', props: { count: 7 } },
          ],
        },
        {
          name: 'hideOnZero toggles',
          props: { count: 0 },
          interactions: [{ type: 'props', props: { hideOnZero: false } }],
        },
      ],
    },
    {
      component: 'NotificationDot',
      cases: [
        { name: 'renders by default', props: {} },
        { name: 'renders nothing when visible is false', props: { visible: false } },
        { name: 'error variant by default', props: {} },
        { name: 'error variant', props: { variant: 'error' } },
        { name: 'warning variant', props: { variant: 'warning' } },
        { name: 'info variant', props: { variant: 'info' } },
        { name: 'success variant', props: { variant: 'success' } },
        { name: 'neutral variant', props: { variant: 'neutral' } },
        { name: 'honours a custom size', props: { size: 14 } },
        { name: 'explicit inline position', props: { position: 'inline' } },
        { name: 'corner position', props: { position: 'corner' } },
        { name: 'corner position with a custom size', props: { position: 'corner', size: 12 } },
        { name: 'forwards className', props: { className: 'dot-cls' } },
        {
          name: 'size changes',
          props: { size: 8 },
          interactions: [{ type: 'props', props: { size: 20 } }],
        },
        {
          name: 'position changes to corner',
          props: { size: 10 },
          interactions: [{ type: 'props', props: { position: 'corner' } }],
        },
        {
          name: 'visibility toggles',
          props: {},
          interactions: [
            { type: 'props', props: { visible: false } },
            { type: 'props', props: { visible: true } },
          ],
        },
      ],
    },
    {
      component: 'NotificationWrapper',
      cases: [
        {
          name: 'renders its child',
          props: { count: 3 },
          children: [{ tag: 'button', attrs: { 'data-child': '' }, children: ['inbox'] }],
        },
        { name: 'renders the badge alongside the child', props: { count: 3 }, children: ['x'] },
        {
          name: 'hides the badge at a count of 0 but keeps the child',
          props: { count: 0 },
          children: ['child-text'],
        },
        {
          name: 'shows a 0 badge when hideOnZero is false',
          props: { count: 0, hideOnZero: false },
          children: ['x'],
        },
        { name: 'positions top-right by default', props: { count: 1 }, children: ['x'] },
        {
          name: 'positions top-left',
          props: { count: 1, placement: 'top-left' },
          children: ['x'],
        },
        {
          name: 'positions bottom-right',
          props: { count: 1, placement: 'bottom-right' },
          children: ['x'],
        },
        {
          name: 'positions bottom-left',
          props: { count: 1, placement: 'bottom-left' },
          children: ['x'],
        },
        {
          name: 'forwards the variant to the badge',
          props: { count: 1, variant: 'info' },
          children: ['x'],
        },
        {
          name: 'forwards className onto the wrapper',
          props: { count: 1, className: 'wrap-cls' },
          children: ['x'],
        },
        {
          name: 'element children',
          props: { count: 2, variant: 'success' },
          children: [{ tag: 'strong', children: ['Inbox'] }],
        },
        {
          name: 'placement changes',
          props: { count: 1 },
          children: ['x'],
          interactions: [{ type: 'props', props: { placement: 'bottom-left' } }],
        },
        {
          name: 'count and variant change',
          props: { count: 1, variant: 'error' },
          children: ['x'],
          interactions: [{ type: 'props', props: { count: 150, variant: 'neutral' } }],
        },
        {
          name: 'badge appears and disappears',
          props: { count: 0 },
          children: ['x'],
          interactions: [
            { type: 'props', props: { count: 4 } },
            { type: 'props', props: { count: 0 } },
          ],
        },
      ],
    },
  ],
}
