/**
 * `@molecule/app-vendor-card-react` cases: the vendor / seller profile card.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** `@molecule/app-vendor-card-react`. */
export const vendorCardFeature: FeatureCases = {
  package: '@molecule/app-vendor-card-react',
  families: [
    {
      component: 'VendorCard',
      cases: [
        { name: 'name only', props: { name: 'Acme Supplies' } },
        { name: 'logo image', props: { name: 'Acme Supplies', logoSrc: '/logos/acme.png' } },
        {
          name: 'description with a zero rating and review count',
          props: {
            name: 'Acme Supplies',
            description: 'Industrial parts, fast shipping',
            rating: 0,
            reviewCount: 0,
          },
        },
        {
          name: 'rating without a review count',
          props: { name: 'V', rating: 4.7 },
        },
        {
          name: 'review count without a rating',
          props: { name: 'V', reviewCount: 312 },
        },
        {
          name: 'member since with badges and actions slots',
          props: { name: 'Acme Supplies', memberSince: 'Jan 2021' },
          slots: {
            badges: [{ tag: 'span', attrs: { 'data-badges': '' }, children: ['Verified'] }],
            actions: [{ tag: 'button', attrs: { type: 'button' }, children: ['Follow'] }],
          },
        },
        {
          name: 'everything, with a className',
          props: {
            name: 'Acme Supplies',
            logoSrc: '/logos/acme.png',
            description: 'Industrial parts, fast shipping',
            rating: 4.7,
            reviewCount: 312,
            memberSince: 'Jan 2021',
            className: 'parity-token',
          },
          slots: {
            badges: [{ tag: 'span', attrs: { 'data-badges': '' }, children: ['Top seller'] }],
            actions: [{ tag: 'button', attrs: { type: 'button' }, children: ['Message'] }],
          },
        },
        {
          name: 'node name falls back to the Vendor alt',
          props: { logoSrc: '/logos/acme.png' },
          slots: { name: [{ tag: 'strong', children: ['Acme'] }] },
        },
        {
          name: 'node description and member since',
          props: { name: 'Acme Supplies', rating: 3.5 },
          slots: {
            description: [{ tag: 'em', children: ['Trusted parts seller'] }],
            memberSince: [{ tag: 'small', children: ['since 2019'] }],
          },
        },
        {
          name: 'clicking the body calls onClick',
          props: { name: 'Acme Supplies' },
          callbacks: ['onClick'],
          interactions: [{ type: 'click', selector: 'h3' }],
        },
        {
          name: 'rating and review count change',
          props: { name: 'Acme Supplies', rating: 4.7, reviewCount: 312 },
          interactions: [{ type: 'props', props: { rating: 3.86, reviewCount: 418 } }],
        },
        {
          name: 'description and actions appear later',
          props: { name: 'Acme Supplies', rating: 4.2 },
          interactions: [
            {
              type: 'props',
              props: { description: 'Industrial parts, fast shipping', actions: 'Visit shop' },
            },
          ],
        },
      ],
    },
  ],
}
