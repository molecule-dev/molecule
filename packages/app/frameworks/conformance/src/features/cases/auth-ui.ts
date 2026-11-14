/**
 * `@molecule/app-auth-ui-react` cases: the config-driven OAuth row (divider,
 * buttons, provider redirect) and the callback half of the flow on the page it
 * is mounted on (code exchange success and a visible failure).
 *
 * @module
 */

import type { CaseContext } from '../../ui/spec.js'
import type { FeatureCases } from '../spec.js'

const API = 'https://api.example.test'
const signedOut: CaseContext = { auth: { status: 'unauthenticated' } }
/** The app's `oauthConfig`: providers, the API, and a recorded way out to the provider. */
const oauthConfig = {
  baseURL: API,
  oauthProviders: ['github', 'google'],
  navigate: { $callback: 'navigate' },
}
/** A provider callback landing back on `/login` with a code the server is asked to exchange. */
const callback = (answer: {
  status: number
  body?: unknown
  headers?: Record<string, string>
  defer?: boolean
}): CaseContext => ({
  ...signedOut,
  window: {
    url: '/login?code=c1&state=s1',
    sessionStorage: { oauth_provider: 'github' },
    fetch: answer,
  },
})

/** `@molecule/app-auth-ui-react`. */
export const authUiFeature: FeatureCases = {
  package: '@molecule/app-auth-ui-react',
  families: [
    {
      component: 'OAuthButtons',
      cases: [
        { name: 'divider and two providers', props: { oauthConfig }, context: signedOut },
        {
          name: 'no providers renders nothing',
          props: { oauthConfig: { ...oauthConfig, oauthProviders: [] } },
          context: signedOut,
        },
        {
          // React re-renders the row with the new config; a port must not keep the
          // provider list it read when it mounted.
          name: 'a changed oauthConfig reaches the same mount',
          props: { oauthConfig },
          context: signedOut,
          interactions: [
            {
              type: 'props',
              props: { oauthConfig: { ...oauthConfig, oauthProviders: ['github'] } },
            },
            { type: 'props', props: { oauthConfig: { ...oauthConfig, oauthProviders: [] } } },
          ],
        },
        {
          name: 'labels, mono icons, own divider and className',
          props: {
            oauthConfig,
            showLabels: true,
            iconMode: 'mono',
            iconSize: 24,
            dividerKey: 'auth.orSignInWith',
            dividerDefault: 'or sign in with',
            className: 'parity-token',
          },
          context: signedOut,
        },
        {
          name: 'click leaves for the provider',
          props: { oauthConfig },
          context: signedOut,
          interactions: [{ type: 'click', selector: '[data-provider="google"]' }],
        },
        {
          name: 'click on /login asks to come back there',
          props: { oauthConfig },
          context: { ...signedOut, window: { url: '/login' } },
          interactions: [{ type: 'click', selector: '[data-provider="github"]' }],
        },
        {
          name: 'a returning code signs in and reports success',
          props: { oauthConfig },
          callbacks: ['onSuccess', 'onError'],
          context: callback({
            status: 200,
            body: { props: { id: 'u1', name: 'Ada' } },
            headers: { Authorization: 'Bearer t1' },
          }),
        },
        {
          name: 'a rejected code shows the error',
          props: { oauthConfig },
          callbacks: ['onSuccess', 'onError'],
          context: callback({ status: 400, body: { error: 'This sign-in link expired.' } }),
        },
        {
          name: 'a rejected code without a reason shows the generic error',
          props: { oauthConfig },
          callbacks: ['onSuccess', 'onError'],
          context: callback({ status: 500, body: {} }),
        },
        {
          // The user signed in, so the session is still established; the page that
          // asked is gone, so neither callback runs.
          name: 'an exchange that settles after leaving the page reports to nobody',
          props: { oauthConfig },
          callbacks: ['onSuccess', 'onError'],
          context: callback({
            status: 200,
            body: { props: { id: 'u1', name: 'Ada' } },
            headers: { Authorization: 'Bearer t1' },
            defer: true,
          }),
          interactions: [{ type: 'unmount' }, { type: 'fetch' }],
        },
        {
          name: 'a rejection that settles after leaving the page reports to nobody',
          props: { oauthConfig },
          callbacks: ['onSuccess', 'onError'],
          context: callback({
            status: 400,
            body: { error: 'This sign-in link expired.' },
            defer: true,
          }),
          interactions: [{ type: 'unmount' }, { type: 'fetch' }],
        },
        {
          // Counterexample: answered while mounted, the same exchange reports success.
          name: 'an exchange held, then answered on the page, reports success',
          props: { oauthConfig },
          callbacks: ['onSuccess', 'onError'],
          context: callback({
            status: 200,
            body: { props: { id: 'u1', name: 'Ada' } },
            headers: { Authorization: 'Bearer t1' },
            defer: true,
          }),
          interactions: [{ type: 'fetch' }],
        },
      ],
    },
  ],
}
