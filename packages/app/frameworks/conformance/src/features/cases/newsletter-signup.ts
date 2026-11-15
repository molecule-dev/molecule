/**
 * `@molecule/app-newsletter-signup-react` cases: the email subscribe form in
 * both layouts, its submitting / error / success states, every text prop, and
 * the two ways a component is rendered after a submit.
 *
 * `onSubscribe` is the only callback; a deferred one holds the form in its
 * submitting state, and the kit's `reject` always rejects with an `Error`, so
 * the component's non-`Error` fallback message is unreachable through a case.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const title = [{ tag: 'strong', children: ['Stay in the loop'] }]
const description = [{ tag: 'em', children: ['Get weekly updates delivered to your inbox.'] }]
const success = [{ tag: 'p', children: ['Thanks for subscribing!'] }]

/** `@molecule/app-newsletter-signup-react`. */
export const newsletterSignupFeature: FeatureCases = {
  package: '@molecule/app-newsletter-signup-react',
  families: [
    {
      component: 'NewsletterSignup',
      cases: [
        { name: 'defaults', props: {} },
        { name: 'title and description', slots: { title, description } },
        { name: 'title only', slots: { title } },
        {
          name: 'custom placeholder, button label and className',
          props: {
            placeholder: 'name@co.com',
            buttonLabel: 'Join now',
            className: 'parity-token',
          },
        },
        { name: 'stacked layout', props: { layout: 'stacked' } },
        { name: 'explicit inline layout', props: { layout: 'inline' } },
        {
          name: 'typing an email updates the field',
          props: {},
          interactions: [{ type: 'input', selector: 'input', value: 'ada@example.test' }],
        },
        {
          name: 'submitting shows the pending label and disables the button',
          props: { buttonLabel: 'Join now' },
          callbacks: ['onSubscribe'],
          callbackResults: { onSubscribe: { defer: true } },
          interactions: [
            { type: 'input', selector: 'input', value: 'ada@example.test' },
            { type: 'submit', selector: 'form' },
          ],
        },
        {
          name: 'a second submit while pending is ignored',
          props: {},
          callbacks: ['onSubscribe'],
          callbackResults: { onSubscribe: { defer: true } },
          interactions: [
            { type: 'input', selector: 'input', value: 'ada@example.test' },
            { type: 'submit', selector: 'form' },
            { type: 'submit', selector: 'form' },
            { type: 'settle', callback: 'onSubscribe' },
          ],
        },
        {
          name: 'a resolved subscribe shows the success content and clears the field',
          props: { successContent: { $nodes: success } },
          callbacks: ['onSubscribe'],
          callbackResults: { onSubscribe: { resolve: undefined } },
          interactions: [
            { type: 'input', selector: 'input', value: 'ada@example.test' },
            { type: 'submit', selector: 'form' },
          ],
        },
        {
          name: 'a resolved subscribe without success content re-renders the empty form',
          props: {},
          callbacks: ['onSubscribe'],
          callbackResults: { onSubscribe: { resolve: undefined } },
          interactions: [
            { type: 'input', selector: 'input', value: 'ada@example.test' },
            { type: 'submit', selector: 'form' },
          ],
        },
        {
          name: 'a rejected subscribe shows the error message',
          props: { title: 'Stay in the loop' },
          callbacks: ['onSubscribe'],
          callbackResults: { onSubscribe: { reject: 'Already subscribed' } },
          interactions: [
            { type: 'input', selector: 'input', value: 'ada@example.test' },
            { type: 'submit', selector: 'form' },
          ],
        },
        {
          name: 'resubmitting clears the error and a success replaces the form',
          props: { successContent: { $nodes: success } },
          callbacks: ['onSubscribe'],
          callbackResults: { onSubscribe: { defer: true } },
          interactions: [
            { type: 'input', selector: 'input', value: 'ada@example.test' },
            { type: 'submit', selector: 'form' },
            { type: 'settle', callback: 'onSubscribe', error: 'Already subscribed' },
            { type: 'submit', selector: 'form' },
            { type: 'settle', callback: 'onSubscribe' },
          ],
        },
        {
          name: 'prop changes while idle',
          props: {},
          interactions: [
            { type: 'props', props: { layout: 'stacked', title: 'Newsletter' } },
            { type: 'props', props: { title: null, buttonLabel: 'Join now' } },
          ],
        },
        {
          name: 'a className change after submit reaches the success wrapper',
          props: { successContent: { $nodes: success } },
          callbacks: ['onSubscribe'],
          callbackResults: { onSubscribe: { resolve: undefined } },
          interactions: [
            { type: 'submit', selector: 'form' },
            { type: 'props', props: { className: 'parity-token' } },
          ],
        },
      ],
    },
  ],
}
