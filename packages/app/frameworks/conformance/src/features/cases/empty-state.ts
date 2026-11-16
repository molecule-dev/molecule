/**
 * `@molecule/app-empty-state-react` cases: the generic centred empty state,
 * its selected-view form, and the inline CTA card.
 *
 * Neither component has a callback prop, so every branch is chosen by props
 * and node slots, and the interactions below change props between renders.
 *
 * @module
 */

import type { CaseA11y, NodeSpec } from '../../ui/spec.js'
import type { FeatureCases } from '../spec.js'

/** The case's media slot is a bare img without alt. */
const BARE_MEDIA: CaseA11y = {
  expect: ['image-alt'],
  reason: "The case's media slot is a bare img without alt",
}

const icon: NodeSpec[] = [{ tag: 'i', attrs: { 'data-icon': '' } }]
const titleNode: NodeSpec[] = [{ tag: 'strong', children: ['No comments yet'] }]
const descriptionNode: NodeSpec[] = [{ tag: 'em', children: ['Nothing here yet.'] }]
const actionButton: NodeSpec[] = [
  { tag: 'button', attrs: { type: 'button', 'data-act': '' }, children: ['Send one'] },
]

/** `@molecule/app-empty-state-react`. */
export const emptyStateFeature: FeatureCases = {
  package: '@molecule/app-empty-state-react',
  families: [
    {
      component: 'EmptyState',
      cases: [
        { name: 'title only', props: { title: 'No comments yet' } },
        { name: 'title as an element', slots: { title: titleNode } },
        {
          name: 'icon above the title',
          props: { title: 'No comments yet' },
          slots: { icon },
        },
        {
          name: 'description without an action',
          props: { title: 'No comments yet', description: 'Comments appear here.' },
        },
        {
          name: 'description as an element',
          props: { title: 'No comments yet' },
          slots: { description: descriptionNode },
        },
        {
          name: 'description with an action',
          props: { title: 'No comments yet', description: 'Comments appear here.' },
          slots: { action: actionButton },
        },
        {
          name: 'action without a description',
          props: { title: 'No comments yet' },
          slots: { action: actionButton },
        },
        {
          name: 'the icon as a node prop',
          props: { title: 'No comments yet', icon: { $nodes: icon } },
        },
        {
          name: 'the description and action as node props',
          props: {
            title: 'No comments yet',
            description: { $nodes: descriptionNode },
            action: { $nodes: actionButton },
          },
        },
        {
          name: 'class names and a data-mol-id',
          props: {
            title: 'No comments yet',
            dataMolId: 'empty-x',
            className: 'parity-token',
            iconWrapperClassName: 'parity-icon',
          },
          slots: { icon },
        },
        {
          name: 'selected view keeps its message and recovery link together',
          props: {
            view: {
              title: 'Your assigned orders are empty',
              description: 'Choose an order from the full list to assign it.',
              action: {
                $nodes: [
                  {
                    tag: 'a',
                    attrs: { href: '/orders' },
                    children: ['Browse all orders'],
                  },
                ],
              },
            },
          },
        },
        {
          name: 'selected view without a description',
          props: {
            view: {
              title: 'No orders yet',
              action: {
                $nodes: [
                  {
                    tag: 'a',
                    attrs: { href: '/orders/new' },
                    children: ['Create an order'],
                  },
                ],
              },
            },
          },
        },
        {
          name: 'selected view with an app-owned button',
          props: {
            view: {
              title: 'No matching documents',
              action: {
                $nodes: [{ tag: 'button', attrs: { type: 'button' }, children: ['Clear filters'] }],
              },
            },
          },
        },
        {
          name: 'selected view title as an element',
          props: {
            view: {
              title: { $nodes: titleNode },
              action: {
                $nodes: [
                  {
                    tag: 'a',
                    attrs: { href: '/orders' },
                    children: ['Browse all orders'],
                  },
                ],
              },
            },
          },
        },
        {
          name: 'a selected view becomes a generic collection',
          props: {
            view: {
              title: 'No orders yet',
              action: {
                $nodes: [
                  {
                    tag: 'a',
                    attrs: { href: '/orders/new' },
                    children: ['Create an order'],
                  },
                ],
              },
            },
          },
          interactions: [{ type: 'props', props: { view: undefined, title: 'No records yet' } }],
        },
        {
          name: 'the description appears on a later render',
          props: { title: 'No comments yet' },
          interactions: [{ type: 'props', props: { description: 'Comments appear here.' } }],
        },
        {
          name: 'the title changes on a later render',
          props: { title: 'No comments yet' },
          interactions: [{ type: 'props', props: { title: 'Still no comments' } }],
        },
      ],
    },
    {
      component: 'CtaCard',
      cases: [
        { name: 'title only', props: { title: 'Connect your bank' } },
        { name: 'title as an element', slots: { title: titleNode } },
        {
          name: 'eyebrow, media, description and an action',
          a11y: BARE_MEDIA,
          props: { title: 'Connect your bank', description: 'Link an account to start tracking.' },
          slots: {
            eyebrow: [{ tag: 'span', attrs: { 'data-eyebrow': '' }, children: ['NEW'] }],
            media: [{ tag: 'img', attrs: { 'data-media': '', src: '/bank.svg' } }],
            action: actionButton,
          },
        },
        {
          name: 'horizontal with the media beside the text',
          a11y: BARE_MEDIA,
          props: { title: 'Connect your bank', layout: 'horizontal' },
          slots: {
            media: [{ tag: 'img', attrs: { 'data-media': '' } }],
            action: actionButton,
          },
        },
        {
          name: 'horizontal without the media',
          props: { title: 'Connect your bank', layout: 'horizontal' },
        },
        {
          name: 'vertical without the media',
          props: { title: 'Connect your bank' },
          slots: { action: actionButton },
        },
        {
          name: 'description without an action',
          props: { title: 'Connect your bank', description: 'Link an account to start tracking.' },
        },
        {
          name: 'media, eyebrow and description as node props',
          a11y: BARE_MEDIA,
          props: {
            title: 'Connect your bank',
            eyebrow: { $nodes: [{ tag: 'b', children: ['NEW'] }] },
            media: { $nodes: [{ tag: 'img', attrs: { 'data-media': '' } }] },
            description: { $nodes: [{ tag: 'em', children: ['Link an account.'] }] },
            action: { $nodes: actionButton },
          },
        },
        {
          name: 'class names and a data-mol-id',
          props: { title: 'Connect your bank', dataMolId: 'cta-x', className: 'parity-token' },
        },
        {
          name: 'the layout switches to horizontal',
          props: { title: 'Connect your bank' },
          interactions: [{ type: 'props', props: { layout: 'horizontal' } }],
        },
        {
          name: 'the eyebrow appears on a later render',
          props: { title: 'Connect your bank' },
          interactions: [{ type: 'props', props: { eyebrow: 'NEW' } }],
        },
        {
          name: 'the title changes on a later render',
          props: { title: 'Connect your bank' },
          interactions: [{ type: 'props', props: { title: 'Link your account' } }],
        },
      ],
    },
  ],
}
