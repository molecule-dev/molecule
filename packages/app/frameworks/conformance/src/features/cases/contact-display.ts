/**
 * `@molecule/app-contact-display-react` cases: the formatted contact card —
 * avatar + name + role above an email/phone/address block with leading glyphs,
 * in the card, row and compact layouts.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** Every field of a contact, for the cases that exercise all of them. */
const contact = {
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '+15551234',
  role: 'CTO',
  company: 'Acme Inc.',
  address: '123 Main St',
}

/** `@molecule/app-contact-display-react`. */
export const contactDisplayFeature: FeatureCases = {
  package: '@molecule/app-contact-display-react',
  families: [
    {
      component: 'ContactDisplay',
      cases: [
        { name: 'card layout with every field', props: { contact } },
        { name: 'explicit card layout', props: { contact, layout: 'card' } },
        { name: 'name only', props: { contact: { name: 'Jane Doe' } } },
        { name: 'row layout', props: { contact, layout: 'row' } },
        {
          name: 'compact layout hides the contact details',
          props: { contact, layout: 'compact' },
        },
        {
          name: 'compact layout keeps the company',
          props: { contact: { name: 'Jane Doe', company: 'Acme Inc.' }, layout: 'compact' },
        },
        {
          name: 'empty optional fields render nothing',
          props: {
            contact: { name: 'Jane Doe', email: '', phone: '', role: '', company: '', address: '' },
          },
        },
        {
          name: 'avatar image instead of initials',
          props: { contact: { ...contact, avatarSrc: 'https://example.com/jane.png' } },
        },
        {
          name: 'email and phone without a company',
          props: { contact: { name: 'Jane Doe', email: 'jane@example.com', phone: '+15551234' } },
        },
        {
          name: 'address without a role or company',
          props: { contact: { name: 'Jane Doe', address: '123 Main St' } },
        },
        {
          name: 'role, company and address as nodes',
          props: {
            contact: {
              name: 'Jane Doe',
              role: { $nodes: [{ tag: 'strong', children: ['CTO'] }] },
              company: { $nodes: [{ tag: 'em', children: ['Acme Inc.'] }] },
              address: {
                $nodes: [{ tag: 'span', attrs: { 'data-address': '' }, children: ['123 Main St'] }],
              },
            },
          },
        },
        {
          name: 'actions slot and className',
          props: { contact, className: 'parity-token' },
          slots: {
            actions: [{ tag: 'button', attrs: { 'data-actions': '' }, children: ['Open'] }],
          },
        },
        {
          name: 'clickable card calls onClick',
          props: { contact },
          callbacks: ['onClick'],
          interactions: [{ type: 'click', selector: '[data-mol-id="contact-display-open"]' }],
        },
        {
          name: 'clickable compact row calls onClick',
          props: { contact, layout: 'compact' },
          callbacks: ['onClick'],
          interactions: [{ type: 'click', selector: '[data-mol-id="contact-display-open"]' }],
        },
        {
          name: 'clicking an inner control does not call onClick',
          props: { contact },
          callbacks: ['onClick'],
          slots: {
            actions: [{ tag: 'button', attrs: { 'data-actions': '' }, children: ['Open'] }],
          },
          interactions: [{ type: 'click', selector: '[data-actions]' }],
        },
        {
          name: 'layout changes through all three',
          props: { contact },
          interactions: [
            { type: 'props', props: { layout: 'row' } },
            { type: 'props', props: { layout: 'compact' } },
            { type: 'props', props: { layout: 'card' } },
          ],
        },
        {
          name: 'contact changes in place',
          props: { contact },
          interactions: [
            {
              type: 'props',
              props: { contact: { name: 'John Roe', email: 'john@example.com' } },
            },
          ],
        },
        {
          name: 'className changes',
          props: { contact, className: 'parity-token' },
          interactions: [{ type: 'props', props: { className: 'parity-other' } }],
        },
      ],
    },
  ],
}
