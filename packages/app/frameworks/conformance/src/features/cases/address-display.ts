/**
 * `@molecule/app-address-display-react` cases: the formatted address card —
 * multi-line or inline, with name, phone, leading icon and action slots.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const address = {
  line1: '123 Main St',
  line2: 'Suite 4',
  city: 'Springfield',
  state: 'IL',
  postalCode: '62704',
  country: 'USA',
}

/** `@molecule/app-address-display-react`. */
export const addressDisplayFeature: FeatureCases = {
  package: '@molecule/app-address-display-react',
  families: [
    {
      component: 'AddressDisplay',
      cases: [
        { name: 'full address, multi-line', props: { address } },
        { name: 'inline joins one line', props: { address, inline: true } },
        {
          name: 'inline toggles from multi-line',
          props: { address },
          interactions: [{ type: 'props', props: { inline: true } }],
        },
        { name: 'city and state only', props: { address: { city: 'Springfield', state: 'IL' } } },
        { name: 'postal code only', props: { address: { postalCode: '62704' } } },
        { name: 'empty address', props: { address: {} } },
        {
          name: 'name and phone link',
          props: { address, phone: '+15551234' },
          slots: { name: ['Acme HQ'] },
        },
        {
          name: 'name as an element',
          props: { address },
          slots: { name: [{ tag: 'strong', children: ['Acme'] }] },
        },
        {
          name: 'leading and actions slots',
          props: { address },
          slots: {
            leading: [{ tag: 'span', attrs: { 'data-leading': '' } }],
            actions: [{ tag: 'span', attrs: { 'data-actions': '' } }],
          },
        },
        {
          name: 'address changes',
          props: { address },
          interactions: [
            { type: 'props', props: { address: { city: 'Springfield', state: 'IL' } } },
          ],
        },
        {
          name: 'everything on, with className',
          props: { address, phone: '+1 555-867-5309', className: 'parity-token' },
          slots: {
            name: ['Jane Smith'],
            leading: [{ tag: 'span', attrs: { 'data-leading': '' } }],
            actions: [{ tag: 'span', attrs: { 'data-actions': '' } }],
          },
        },
      ],
    },
  ],
}
