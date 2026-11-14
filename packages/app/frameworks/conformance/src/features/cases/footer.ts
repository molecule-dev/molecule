/**
 * `@molecule/app-footer-react` cases: about link, the privacy / terms modals
 * (or route links), the language picker and the version.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const legal = {
  en: {
    content: {
      privacyPolicy: '<h2>Privacy</h2><p>{{appName}} keeps your data private.</p>',
      termsOfService: '<h2>Terms</h2><p>Use {{appName}} kindly.</p>',
    },
  },
}

/** `@molecule/app-footer-react`. */
export const footerFeature: FeatureCases = {
  package: '@molecule/app-footer-react',
  families: [
    {
      component: 'AppFooter',
      cases: [
        { name: 'internal about link', props: { appName: 'Acme', aboutHref: '/about' } },
        {
          name: 'external about link, className and id',
          props: {
            appName: 'Acme',
            aboutHref: 'https://acme.example',
            className: 'parity-token',
            dataMolId: 'bottom',
          },
        },
        {
          name: 'route legal links',
          props: {
            appName: 'Acme',
            aboutHref: '/about',
            legalMode: 'route',
            termsTo: '/legal/terms',
          },
        },
        {
          name: 'route legal link navigates',
          props: { appName: 'Acme', aboutHref: '/about', legalMode: 'route' },
          interactions: [{ type: 'click', selector: 'a[href="/privacy"]' }],
        },
        {
          name: 'about link navigates',
          props: { appName: 'Acme', aboutHref: '/about' },
          interactions: [{ type: 'click', selector: 'a[href="/about"]' }],
        },
        {
          name: 'privacy modal without content shows the placeholder',
          props: { appName: 'Acme', aboutHref: '/about' },
          interactions: [
            { type: 'click', selector: 'footer button:nth-of-type(1)' },
            { type: 'keydown', selector: '[role="dialog"]', key: 'Escape' },
          ],
        },
        {
          name: 'terms modal loads its content first',
          props: { appName: 'Acme', aboutHref: '/about' },
          callbacks: ['loadContent'],
          context: { translations: legal },
          interactions: [{ type: 'click', selector: 'footer button:nth-of-type(2)' }],
        },
        {
          name: 'privacy content escapes the app name',
          props: { appName: 'Acme <b>Co</b>', aboutHref: '/about' },
          context: { translations: legal },
          interactions: [{ type: 'click', selector: 'footer button:nth-of-type(1)' }],
        },
        {
          name: 'language picker switches the locale',
          props: { appName: 'Acme', aboutHref: '/about' },
          interactions: [
            { type: 'click', selector: 'footer button[aria-label="Language"]' },
            { type: 'click', selector: '[role="dialog"] button:nth-of-type(2)' },
          ],
        },
      ],
    },
  ],
}
