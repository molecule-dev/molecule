/**
 * `@molecule/app-help-button-react` cases: the floating / inline help button.
 *
 * @module
 */

import type { CaseA11y } from '../../ui/spec.js'
import type { FeatureCases } from '../spec.js'

/** The case passes an empty label. */
const EMPTY_LABEL: CaseA11y = {
  expect: ['button-name'],
  reason: 'The case passes an empty label',
}

const icon = [{ tag: 'span', attrs: { 'data-icon': '' }, children: ['!'] }]

/** `@molecule/app-help-button-react`. */
export const helpButtonFeature: FeatureCases = {
  package: '@molecule/app-help-button-react',
  families: [
    {
      component: 'HelpButton',
      cases: [
        { name: 'defaults' },
        { name: 'small size', props: { size: 'sm' } },
        { name: 'medium size', props: { size: 'md' } },
        { name: 'large size', props: { size: 'lg' } },
        { name: 'bottom right position', props: { position: 'bottom-right' } },
        { name: 'bottom left position', props: { position: 'bottom-left' } },
        { name: 'inline position', props: { position: 'inline' } },
        { name: 'notification dot', props: { hasNotification: true } },
        { name: 'no notification dot', props: { hasNotification: false } },
        { name: 'custom label', props: { label: 'Get support' } },
        { name: 'empty label', a11y: EMPTY_LABEL, props: { label: '' } },
        { name: 'custom icon', slots: { icon } },
        { name: 'className passthrough', props: { className: 'hb-cls' } },
        {
          name: 'href renders a link',
          props: { href: '/support' },
          interactions: [
            { type: 'mouseenter', selector: 'a' },
            { type: 'mouseleave', selector: 'a' },
          ],
        },
        {
          name: 'href wins over onClick',
          props: { href: '/support' },
          callbacks: ['onClick'],
          interactions: [{ type: 'click', selector: 'a' }],
        },
        {
          name: 'click calls onClick',
          callbacks: ['onClick'],
          interactions: [{ type: 'click', selector: 'button' }],
        },
        {
          name: 'hover scales the button',
          interactions: [
            { type: 'mouseenter', selector: 'button' },
            { type: 'mouseleave', selector: 'button' },
          ],
        },
        {
          name: 'prop changes',
          props: { size: 'sm', position: 'bottom-right' },
          interactions: [
            {
              type: 'props',
              props: {
                size: 'lg',
                position: 'inline',
                hasNotification: true,
                label: 'Need help?',
              },
            },
          ],
        },
      ],
    },
  ],
}
