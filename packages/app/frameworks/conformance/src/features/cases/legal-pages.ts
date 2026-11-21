/**
 * `@molecule/app-legal-pages-react` cases: the Terms / Privacy scaffolds, the
 * bonded legal-content page, the in-place legal modals, the content-page shell,
 * the two layout primitives and the post-checkout confirmation page.
 *
 * `<PlanUpdatedPage>` reads auth, i18n and HTTP, so every case mounts through
 * the binding kit's full composition (`composition: 'app'`): each case's
 * context seeds the fake services (`auth` for the session, `window.url` for the
 * provider's return query, `http` for the verification call, `translations` for
 * per-app copy). The verification request is recorded like any other service
 * call.
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

/** The verification request the confirmation page posts for the return above. */
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

/**
 * The catalog the fake i18n provider serves: the bonded legal HTML (with the
 * `{{appName}}` placeholder React interpolates), the footer/eyebrow labels and
 * a French locale for the locale-switch cases.
 */
const legal = {
  en: {
    content: {
      privacyPolicy: '<h2>Privacy</h2><p>{{appName}} keeps your data private.</p>',
      termsOfService: '<h2>Terms</h2><p>Use {{appName}} kindly.</p>',
    },
    footer: { privacyPolicy: 'Privacy Policy', termsOfService: 'Terms of Service' },
    nav: { legal: 'Legal' },
  },
  fr: {
    content: {
      privacyPolicy: '<h2>Confidentialité</h2><p>{{appName}} protège vos données.</p>',
      termsOfService: '<h2>Conditions</h2><p>Utilisez {{appName}} correctement.</p>',
    },
    footer: {
      privacyPolicy: 'Politique de confidentialité',
      termsOfService: "Conditions d'utilisation",
    },
    nav: { legal: 'Mentions légales' },
  },
}

/** A header node the shell/page slots receive. */
const header = [{ tag: 'header', children: ['Acme'] }]

/** A footer node the shell/page slots receive. */
const footer = [{ tag: 'footer', children: ['© Acme'] }]

/** A paragraph body node. */
const paragraph = (text: string): { tag: string; children: string[] } => ({
  tag: 'p',
  children: [text],
})

/** `@molecule/app-legal-pages-react`. */
export const legalPagesFeature: FeatureCases = {
  package: '@molecule/app-legal-pages-react',
  composition: 'app',
  families: [
    {
      component: 'ContentPageShell',
      cases: [
        { name: 'content only', children: ['Body copy'] },
        {
          name: 'hero with eyebrow, title and subtitle',
          slots: {
            eyebrow: ['Legal'],
            title: ['Terms of Service'],
            subtitle: ['Last updated June 2025'],
          },
          children: ['Body copy'],
        },
        {
          name: 'title without eyebrow or subtitle',
          slots: { title: ['Privacy'] },
          children: ['Body copy'],
        },
        {
          name: 'header and footer around the body',
          slots: { header, footer, title: ['Terms of Service'] },
          children: ['Body copy'],
        },
        {
          name: 'id and the widest container',
          props: { dataMolId: 'page-legal', containerSize: 'xl' },
          slots: { title: ['Terms of Service'] },
          children: ['Body copy'],
        },
        {
          name: 'bare body skips the surface card',
          props: { bare: true, containerSize: 'lg' },
          slots: { title: ['Pricing'] },
          children: [{ tag: 'div', attrs: { 'data-tier': '' }, children: ['Pro'] }],
        },
        {
          name: 'the narrowest container',
          props: { containerSize: 'sm' },
          slots: { title: ['Terms'] },
          children: ['Body copy'],
        },
        {
          name: 'container size changes',
          props: { containerSize: 'md' },
          slots: { title: ['Terms'] },
          children: ['Body copy'],
          interactions: [{ type: 'props', props: { containerSize: 'lg' } }],
        },
      ],
    },
    {
      component: 'LegalContentPage',
      cases: [
        {
          name: 'terms body with the app name',
          props: { kind: 'terms', appName: 'Acme' },
          context: { translations: legal },
        },
        {
          name: 'privacy body with the app name',
          props: { kind: 'privacy', appName: 'Acme' },
          context: { translations: legal },
        },
        {
          name: 'no app name leaves the placeholder literal',
          props: { kind: 'privacy' },
          context: { translations: legal },
        },
        {
          name: 'escapes markup carried by the app name',
          props: {
            kind: 'privacy',
            appName: 'Acme<img src=x onerror=alert(1)><script>evil()</script>',
          },
          context: { translations: legal },
        },
        {
          name: 'loads the content on mount and when the kind changes',
          props: { kind: 'privacy', appName: 'Acme' },
          callbacks: ['loadContent'],
          context: { translations: legal },
          interactions: [{ type: 'props', props: { kind: 'terms' } }],
        },
        {
          name: 'header and footer chrome',
          props: { kind: 'terms', appName: 'Acme' },
          slots: { header, footer },
          context: { translations: legal },
        },
        {
          name: 'custom eyebrow copy from its key',
          props: { kind: 'terms', eyebrowKey: 'app.legal' },
          context: {
            translations: { en: { ...legal.en, app: { legal: 'Legal notice' } } },
          },
        },
        {
          name: 'custom eyebrow default when the key is missing',
          props: { kind: 'terms', eyebrowKey: 'app.missing', eyebrowDefault: 'Legal notice' },
          context: { translations: legal },
        },
        {
          name: 'copy follows a locale switch',
          props: { kind: 'privacy', appName: 'Acme' },
          context: { translations: legal },
          interactions: [{ type: 'locale', locale: 'fr' }],
        },
      ],
    },
    {
      component: 'LegalModalLinks',
      cases: [
        {
          name: 'both links with the app name',
          props: { appName: 'Acme', linkClassName: 'parity-link' },
          context: { translations: legal },
        },
        {
          name: 'privacy link only',
          props: { appName: 'Acme', show: 'privacy' },
          context: { translations: legal },
        },
        {
          name: 'terms link only',
          props: { appName: 'Acme', show: 'terms' },
          context: { translations: legal },
        },
        {
          name: 'custom labels replace the translated text',
          slots: {
            privacyLabel: [{ tag: 'strong', children: ['Your privacy'] }],
            termsLabel: ['The terms'],
          },
          context: { translations: legal },
        },
        {
          name: 'the privacy modal opens and closes',
          props: { appName: 'Acme' },
          context: { translations: legal },
          interactions: [
            { type: 'click', selector: 'button:first-of-type' },
            { type: 'click', selector: '[data-mol-id="modal-close"]' },
          ],
        },
        {
          name: 'the terms modal opens and closes on Escape',
          props: { appName: 'Acme' },
          context: { translations: legal },
          interactions: [
            { type: 'click', selector: 'button:last-of-type' },
            { type: 'keydown', selector: '[role="dialog"]', key: 'Escape' },
          ],
        },
        {
          name: 'loads the content before opening',
          props: { appName: 'Acme' },
          callbacks: ['loadContent'],
          context: { translations: legal },
          interactions: [{ type: 'click', selector: 'button:first-of-type' }],
        },
        {
          name: 'escapes markup carried by the app name in both modals',
          props: { appName: 'Acme<img src=x onerror=alert(1)><script>evil()</script>' },
          context: { translations: legal },
          interactions: [
            { type: 'click', selector: 'button:first-of-type' },
            { type: 'click', selector: '[data-mol-id="modal-close"]' },
            { type: 'click', selector: 'button:last-of-type' },
          ],
        },
        {
          name: 'follows a show change',
          props: { appName: 'Acme', show: 'both' },
          context: { translations: legal },
          interactions: [{ type: 'props', props: { show: 'terms' } }],
        },
      ],
    },
    {
      component: 'LegalPageLayout',
      cases: [
        {
          name: 'title and body',
          slots: { title: ['Terms of Service'] },
          children: [paragraph('These terms govern your use of the service.')],
        },
        {
          name: 'id and a custom container size',
          props: { dataMolId: 'page-terms', containerSize: 'sm' },
          slots: { title: ['Terms of Service'] },
          children: [paragraph('Body')],
        },
        {
          name: 'custom main and body classes',
          props: { mainClassName: 'parity-main', bodyClassName: 'parity-body' },
          slots: { title: ['Terms'] },
          children: [paragraph('Body')],
        },
        {
          name: 'a wider stack gap',
          props: { stackGap: 8, containerSize: 'xl' },
          slots: { title: ['Terms'] },
          children: [paragraph('Body')],
        },
        {
          name: 'container size changes',
          props: { containerSize: 'md' },
          slots: { title: ['Terms'] },
          children: [paragraph('Body')],
          interactions: [{ type: 'props', props: { containerSize: 'lg' } }],
        },
      ],
    },
    {
      component: 'LegalPageSection',
      cases: [
        {
          name: 'title and one paragraph',
          slots: { title: ['Acceptance'] },
          children: [paragraph('By using this service you agree to these terms.')],
        },
        {
          name: 'a wider stack gap',
          props: { stackGap: 4 },
          slots: { title: ['Use of service'] },
          children: [paragraph('Do not abuse the service.')],
        },
        {
          name: 'stack gap changes',
          props: { stackGap: 2 },
          slots: { title: ['Privacy'] },
          children: [paragraph('We keep your data private.')],
          interactions: [{ type: 'props', props: { stackGap: 6 } }],
        },
      ],
    },
    {
      component: 'PlanUpdatedPage',
      cases: [
        { name: 'confirmation for a signed-in visitor', context: authed },
        {
          name: 'spinner while the session is still hydrating',
          context: { auth: { status: 'loading' } },
        },
        {
          name: 'follows the session finishing its hydration',
          context: { auth: { status: 'loading' } },
          interactions: [{ type: 'auth', status: 'authenticated', user }],
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
          name: 'modified clicks on the link are left to the browser',
          context: { ...authed, route: '/plan-updated' },
          interactions: [
            { type: 'click', selector: 'a', modifiers: { ctrlKey: true } },
            { type: 'click', selector: 'a', modifiers: { metaKey: true } },
            { type: 'click', selector: 'a', modifiers: { shiftKey: true } },
          ],
        },
      ],
    },
    {
      component: 'PrivacyPage',
      cases: [
        { name: 'default scaffold' },
        {
          name: 'supplied body replaces the boilerplate intro',
          children: [{ tag: 'p', attrs: { 'data-real': '' }, children: ['real'] }],
        },
        { name: 'custom title default', props: { titleDefault: 'Datenschutz' } },
        {
          name: 'custom title and intro keys',
          props: { titleKey: 'app.privacy', introKey: 'app.intro' },
          context: {
            translations: {
              en: { app: { privacy: 'Your privacy', intro: 'We keep it private.' } },
            },
          },
        },
        { name: 'a wider stack gap', props: { stackGap: 6 } },
        {
          name: 'copy follows a locale switch',
          props: { titleKey: 'app.privacy', introKey: 'app.intro' },
          context: {
            translations: {
              en: { app: { privacy: 'Your privacy', intro: 'We keep it private.' } },
              fr: { app: { privacy: 'Votre vie privée', intro: 'Nous la gardons privée.' } },
            },
          },
          interactions: [{ type: 'locale', locale: 'fr' }],
        },
      ],
    },
    {
      component: 'TermsPage',
      cases: [
        { name: 'default scaffold' },
        {
          name: 'supplied body replaces the boilerplate intro',
          children: [{ tag: 'p', attrs: { 'data-real': '' }, children: ['real'] }],
        },
        { name: 'custom title default', props: { titleDefault: 'Nutzungsbedingungen' } },
        {
          name: 'custom title and intro keys',
          props: { titleKey: 'app.terms', introKey: 'app.intro' },
          context: {
            translations: {
              en: { app: { terms: 'Your terms', intro: 'Please read these terms.' } },
            },
          },
        },
        { name: 'a wider stack gap', props: { stackGap: 6 } },
        {
          name: 'copy follows a locale switch',
          props: { titleKey: 'app.terms', introKey: 'app.intro' },
          context: {
            translations: {
              en: { app: { terms: 'Your terms', intro: 'Please read these terms.' } },
              fr: { app: { terms: 'Vos conditions', intro: 'Veuillez lire ces conditions.' } },
            },
          },
          interactions: [{ type: 'locale', locale: 'fr' }],
        },
      ],
    },
  ],
  frameworkShaped: {
    useLegalModals:
      'returns the modal elements themselves (React elements, Vue VNodes, Solid JSX, a Svelte/Angular component) plus the openers, so the value cannot be compared as plain data; the same modal DOM is compared through LegalModalLinks',
  },
}
