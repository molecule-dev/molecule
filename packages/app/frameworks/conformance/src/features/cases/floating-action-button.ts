/**
 * `@molecule/app-floating-action-button-react` cases: the fixed-position FAB,
 * its four corners, three sizes, icon slot, tooltip and link-or-callback
 * branches.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const icon = [{ tag: 'span', attrs: { 'data-icon': '' }, children: ['+'] }]
const svgIcon = [{ tag: 'svg', attrs: { 'data-icon': '', viewBox: '0 0 24 24' } }]

/** `@molecule/app-floating-action-button-react`. */
export const floatingActionButtonFeature: FeatureCases = {
  package: '@molecule/app-floating-action-button-react',
  families: [
    {
      component: 'FloatingActionButton',
      cases: [
        { name: 'defaults', props: { label: 'Add' } },
        { name: 'with an icon', props: { label: 'Add' }, slots: { icon } },
        {
          name: 'svg icon and a className',
          props: { label: 'Create', className: 'fab-cls' },
          slots: { icon: svgIcon },
        },
        { name: 'bottom right position', props: { label: 'Add', position: 'bottom-right' } },
        { name: 'bottom left position', props: { label: 'Add', position: 'bottom-left' } },
        { name: 'top right position', props: { label: 'Add', position: 'top-right' } },
        { name: 'top left position', props: { label: 'Add', position: 'top-left' } },
        { name: 'small size', props: { label: 'Add', size: 'sm' } },
        { name: 'medium size', props: { label: 'Add', size: 'md' } },
        { name: 'large size', props: { label: 'Add', size: 'lg' } },
        { name: 'tooltip shown', props: { label: 'Add', showTooltip: true } },
        { name: 'tooltip hidden', props: { label: 'Add', showTooltip: false } },
        { name: 'empty label', props: { label: '' } },
        {
          name: 'label resolved through i18n',
          props: { label: 'fab.add' },
          context: { translations: { en: { fab: { add: 'Add item' } } } },
        },
        {
          name: 'href renders a link',
          props: { label: 'Add', href: '/new' },
          slots: { icon },
        },
        {
          name: 'href wins over onClick',
          props: { label: 'Add', href: '/new' },
          callbacks: ['onClick'],
          interactions: [{ type: 'click', selector: 'a' }],
        },
        {
          name: 'click calls onClick',
          props: { label: 'Add' },
          slots: { icon },
          callbacks: ['onClick'],
          interactions: [{ type: 'click', selector: 'button' }],
        },
        {
          name: 'click without a handler',
          props: { label: 'Add' },
          interactions: [{ type: 'click', selector: 'button' }],
        },
        {
          name: 'prop changes',
          props: { label: 'Add', position: 'bottom-right', size: 'sm' },
          interactions: [
            {
              type: 'props',
              props: { label: 'Create', position: 'top-left', size: 'lg', showTooltip: false },
            },
          ],
        },
        {
          name: 'switches from a button to a link',
          props: { label: 'Add' },
          callbacks: ['onClick'],
          interactions: [
            { type: 'click', selector: 'button' },
            { type: 'props', props: { href: '/new' } },
            { type: 'click', selector: 'a' },
          ],
        },
      ],
    },
  ],
}
