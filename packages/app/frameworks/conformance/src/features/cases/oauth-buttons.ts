/**
 * `@molecule/app-oauth-buttons-react` cases: the provider button row in every
 * layout and mode, its select/success flow, and the divider.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const two = ['github', 'google']
const five = ['github', 'google', 'apple', 'microsoft', 'discord']

/** `@molecule/app-oauth-buttons-react`. */
export const oauthButtonsFeature: FeatureCases = {
  package: '@molecule/app-oauth-buttons-react',
  families: [
    {
      component: 'OAuthButtons',
      cases: [
        { name: 'two providers, icon only', props: { providers: two } },
        { name: 'duplicates render once', props: { providers: ['github', 'google', 'github'] } },
        { name: 'no providers renders nothing', props: { providers: [] } },
        {
          name: 'labels, brand buttons and mono icons',
          props: {
            providers: [...two, 'x'],
            showLabels: true,
            brandButtons: true,
            iconMode: 'mono',
            iconSize: 24,
            className: 'parity-token',
          },
        },
        { name: 'vertical layout', props: { providers: two, layout: 'vertical' } },
        { name: 'grid of five', props: { providers: five, layout: 'grid' } },
        {
          name: 'grid of three',
          props: { providers: ['github', 'google', 'apple'], layout: 'grid' },
        },
        {
          name: 'unknown provider with a label',
          props: { providers: ['acme'], showLabels: true, brandButtons: true },
        },
        {
          name: 'click selects the provider',
          props: { providers: two },
          callbacks: ['onSelect', 'onSuccess'],
          interactions: [{ type: 'click', selector: '[data-provider="google"]' }],
        },
        {
          name: 'a resolved select reports success',
          props: { providers: two },
          callbacks: ['onSelect', 'onSuccess'],
          callbackResults: { onSelect: { resolve: null } },
          interactions: [{ type: 'click', selector: '[data-provider="github"]' }],
        },
        {
          name: 'a rejected select reports nothing',
          props: { providers: two },
          callbacks: ['onSelect', 'onSuccess'],
          callbackResults: { onSelect: { reject: 'popup closed' } },
          interactions: [{ type: 'click', selector: '[data-provider="github"]' }],
        },
        {
          name: 'no select handler',
          props: { providers: two },
          interactions: [{ type: 'click', selector: '[data-provider="github"]' }],
        },
        {
          name: 'providers change',
          props: { providers: two },
          interactions: [{ type: 'props', props: { providers: ['apple'] } }],
        },
      ],
      keyedLists: [{ prop: 'providers', selector: 'button' }],
    },
    {
      component: 'OAuthDivider',
      cases: [
        { name: 'default label' },
        {
          name: 'own label and className',
          props: {
            labelKey: 'auth.orSignInWith',
            labelDefault: 'or sign in with',
            className: 'parity-token',
          },
        },
      ],
    },
  ],
  values: [
    { export: 'BRAND_STYLES' },
    { export: 'PROVIDER_LABELS' },
    { export: 'getProviderLabel', calls: [['google'], ['x'], ['acme']] },
    { export: 'dedupeProviders', calls: [[['github', 'google', 'github']], [[]]] },
  ],
  frameworkShaped: {
    getBrandStyle: 'returns the inline style object for the framework (React adds px to numbers)',
    getLayoutStyle: 'returns the inline style object for the framework',
    getButtonLayoutStyle: 'returns the inline style object for the framework',
  },
}
