/**
 * `@molecule/app-oauth-logos-react` cases: every brand mark in each mode, and
 * the dispatcher for every provider id.
 *
 * @module
 */

import type { UICase, UIComponentCases } from '../../ui/spec.js'
import type { FeatureCases } from '../spec.js'

/** Every individual logo export. `XLogo` is the same mark as `TwitterLogo`. */
const LOGOS = [
  'AppleLogo',
  'DiscordLogo',
  'FacebookLogo',
  'GitHubLogo',
  'GitLabLogo',
  'GoogleLogo',
  'LinkedInLogo',
  'MicrosoftLogo',
  'TwitterLogo',
  'XLogo',
]

/** The props every logo accepts, in each combination that changes its DOM. */
const logoCases: UICase[] = [
  { name: 'brand at the default size' },
  { name: 'mono at 32 with a title', props: { size: 32, mode: 'mono', title: 'Sign in' } },
  { name: 'decorative with a className', props: { ariaLabel: '', className: 'parity-token' } },
  { name: 'own label', props: { ariaLabel: 'Sign in with this provider', size: 16 } },
]

const PROVIDERS = [
  'github',
  'gitlab',
  'google',
  'twitter',
  'x',
  'apple',
  'facebook',
  'microsoft',
  'linkedin',
  'discord',
]

/** The dispatcher for every provider id, an unknown id with and without a fallback. */
const dispatcher: UIComponentCases = {
  component: 'OAuthProviderLogo',
  cases: [
    ...PROVIDERS.map((provider) => ({ name: provider, props: { provider } })),
    { name: 'mono github at 24', props: { provider: 'github', mode: 'mono', size: 24 } },
    { name: 'unknown provider renders nothing', props: { provider: 'acme' } },
    {
      name: 'unknown provider with a fallback',
      props: { provider: 'acme' },
      slots: { fallback: [{ tag: 'span', children: ['A'] }] },
    },
  ],
}

/** `@molecule/app-oauth-logos-react`. */
export const oauthLogosFeature: FeatureCases = {
  package: '@molecule/app-oauth-logos-react',
  families: [
    dispatcher,
    ...LOGOS.map((component) => ({ component, cases: logoCases.map((c) => ({ ...c })) })),
  ],
}
