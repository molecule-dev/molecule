/**
 * `@molecule/app-plan-updated-page-react` cases: the post-purchase
 * confirmation page — the auth-hydration spinner, the confirmation itself,
 * the confirmation call a hosted checkout return makes, its retry, the copy
 * props and the two links.
 *
 * `<PlanUpdated>` reads auth, i18n and HTTP, so every case mounts through the
 * binding kit's full composition (`composition: 'app'`): each case's context
 * seeds the fake services (`auth` for the session, `window.url` for the
 * provider's return query, `http` for the verification call, `translations`
 * for per-app copy). The verification request is recorded like any other
 * service call.
 *
 * @module
 */

import type { BindingContext, HttpScript } from '../../bindings/spec.js'
import type { FeatureCases } from '../spec.js'

/** The signed-in user the auth fake serves; its `id` names the wire URL. */
const user = { id: 'u1', name: 'Ada Lovelace', email: 'ada@example.test' }

/** The authenticated context the signed-in cases run with. */
const authed: BindingContext = { auth: { status: 'authenticated', user } }

/** Where a Stripe checkout returns the buyer, the payment id in the query. */
const returnUrl = '/plan-updated?provider=stripe&sessionId=cs_live_1'

/** The verification request the page posts for the return above. */
const verifyPost = (answer: Omit<HttpScript, 'method' | 'url'> = {}): HttpScript => ({
  method: 'POST',
  url: '/users/u1/verify-payment/stripe',
  data: {},
  ...answer,
})

/** The authenticated return-page context: the checkout return, and what answers it. */
const returning = (scripts: HttpScript[]): BindingContext => ({
  ...authed,
  window: { url: returnUrl },
  http: scripts,
})

/** `@molecule/app-plan-updated-page-react`. */
export const planUpdatedPageFeature: FeatureCases = {
  package: '@molecule/app-plan-updated-page-react',
  composition: 'app',
  families: [
    {
      component: 'PlanUpdated',
      cases: [
        { name: 'confirmation for a signed-in visitor', context: authed },
        {
          name: 'confirmation while signed out',
          context: { auth: { status: 'unauthenticated' } },
        },
        {
          name: 'confirmation while the session is unavailable',
          context: { auth: { status: 'unavailable' } },
        },
        {
          name: 'spinner while the session is still hydrating',
          context: { ...authed, auth: { status: 'loading' } },
        },
        {
          name: 'follows the session finishing its hydration',
          context: { auth: { status: 'loading' } },
          interactions: [
            { type: 'auth', status: 'authenticated', user },
            { type: 'auth', status: 'loading' },
          ],
        },
        {
          name: 'spinner while the purchase is confirmed, then the confirmation',
          context: returning([verifyPost({ defer: true })]),
          interactions: [{ type: 'http', method: 'POST', url: verifyPost().url }],
        },
        {
          name: 'offers a retry when the confirmation fails',
          context: returning([verifyPost({ status: 502, data: { error: 'bad gateway' } })]),
        },
        {
          name: 'retries the confirmation and then confirms',
          context: returning([verifyPost({ status: 502 }), verifyPost({ defer: true })]),
          interactions: [
            { type: 'click', selector: '[data-mol-id="plan-updated-retry"]' },
            { type: 'http', method: 'POST', url: verifyPost().url },
          ],
        },
        {
          name: 'skips the confirmation when the app opts out',
          props: { verify: false },
          context: { ...authed, window: { url: returnUrl } },
        },
        {
          name: 'confirms with the provider the app names',
          props: { provider: 'stripe' },
          context: {
            ...authed,
            window: { url: '/plan-updated?sessionId=cs_live_1' },
            http: [verifyPost({ defer: true })],
          },
          interactions: [{ type: 'http', method: 'POST', url: verifyPost().url }],
        },
        {
          name: 'custom copy and action path',
          props: {
            messageKey: 'app.upgraded',
            messageDefault: 'You are on Pro.',
            thankYouKey: 'app.thanks',
            thankYouDefault: 'Enjoy the upgrade.',
            actionKey: 'app.dashboard',
            actionDefault: 'Go to dashboard',
            actionHref: '/dashboard',
          },
          context: authed,
        },
        {
          name: 'renders the copy the locale bond serves',
          props: { messageKey: 'app.upgraded', thankYouKey: 'app.thanks' },
          context: {
            ...authed,
            translations: {
              en: { app: { upgraded: 'You are on Pro.', thanks: 'Enjoy the upgrade.' } },
            },
          },
        },
        {
          name: 'follows a locale switch',
          props: { messageKey: 'app.upgraded', actionKey: 'app.dashboard' },
          context: {
            ...authed,
            translations: {
              en: { app: { upgraded: 'You are on Pro.', dashboard: 'Go to dashboard' } },
              fr: { app: { upgraded: 'Vous êtes sur Pro.', dashboard: 'Tableau de bord' } },
            },
          },
          interactions: [{ type: 'locale', locale: 'fr' }],
        },
        {
          name: 'follows a prop change',
          props: { actionHref: '/' },
          context: authed,
          interactions: [{ type: 'props', props: { actionHref: '/dashboard' } }],
        },
        {
          name: 'the return-home action navigates',
          context: { ...authed, route: '/plan-updated' },
          interactions: [{ type: 'click', selector: 'a' }],
        },
        {
          name: 'the view-receipt link navigates to billing',
          context: { ...authed, route: '/plan-updated' },
          interactions: [{ type: 'click', selector: '[data-mol-id="plan-updated-view-receipt"]' }],
        },
        {
          name: 'modified clicks on the links are left to the browser',
          context: { ...authed, route: '/plan-updated' },
          interactions: [
            { type: 'click', selector: 'a', modifiers: { ctrlKey: true } },
            { type: 'click', selector: 'a', modifiers: { metaKey: true } },
            {
              type: 'click',
              selector: '[data-mol-id="plan-updated-view-receipt"]',
              modifiers: { shiftKey: true },
            },
          ],
        },
      ],
    },
  ],
}
