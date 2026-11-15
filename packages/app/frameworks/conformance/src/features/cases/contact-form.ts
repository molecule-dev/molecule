/**
 * `@molecule/app-contact-form-react` cases: the name + email + message form in
 * its default, titled, extra-fields, submitting, error and success states,
 * every text prop, and prop changes while idle and after a submit.
 *
 * `onSubmit` is the only callback. A deferred one holds the form in its
 * submitting state, and the kit's `reject` always rejects with an `Error`, so
 * the component's non-`Error` fallback message is unreachable through a case.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const title = [{ tag: 'strong', children: ['Get in touch'] }]
const description = [{ tag: 'em', children: ['We reply within one business day.'] }]
const submitLabel = [{ tag: 'span', children: ['Send now'] }]
const extraFields = [{ tag: 'input', attrs: { 'data-extra': '', placeholder: 'Phone' } }]
const success = [{ tag: 'p', children: ['Thanks! We will be in touch.'] }]

/** `@molecule/app-contact-form-react`. */
export const contactFormFeature: FeatureCases = {
  package: '@molecule/app-contact-form-react',
  families: [
    {
      component: 'ContactForm',
      cases: [
        { name: 'defaults', props: {} },
        { name: 'title and description', slots: { title, description } },
        { name: 'title only', slots: { title } },
        { name: 'description only', slots: { description } },
        {
          name: 'title and description as text',
          props: { title: 'Contact us', description: 'we reply fast' },
        },
        { name: 'empty title and description', props: { title: '', description: '' } },
        {
          name: 'title with an empty description',
          props: { title: 'Contact us', description: '' },
        },
        { name: 'custom submit label', props: { submitLabel: 'Get in touch' } },
        { name: 'custom submit label as a node', props: { submitLabel: { $nodes: submitLabel } } },
        { name: 'empty submit label', props: { submitLabel: '' } },
        { name: 'extra fields', slots: { extraFields } },
        {
          name: 'extra fields with title and description',
          slots: { title, description, extraFields },
        },
        { name: 'className', props: { className: 'parity-token' } },
        {
          name: 'typing all three fields',
          props: {},
          interactions: [
            { type: 'input', selector: 'input[aria-label="Name"]', value: 'Ada Lovelace' },
            { type: 'input', selector: 'input[aria-label="Email"]', value: 'ada@example.test' },
            { type: 'input', selector: 'textarea[aria-label="Message"]', value: 'Hello there' },
          ],
        },
        {
          name: 'submitting shows the pending label and disables the button',
          props: { submitLabel: 'Get in touch' },
          callbacks: ['onSubmit'],
          callbackResults: { onSubmit: { defer: true } },
          interactions: [
            { type: 'input', selector: 'input[aria-label="Name"]', value: 'Ada Lovelace' },
            { type: 'input', selector: 'input[aria-label="Email"]', value: 'ada@example.test' },
            { type: 'input', selector: 'textarea[aria-label="Message"]', value: 'Hello there' },
            { type: 'submit', selector: 'form' },
          ],
        },
        {
          name: 'a second submit while pending is ignored',
          props: {},
          callbacks: ['onSubmit'],
          callbackResults: { onSubmit: { defer: true } },
          interactions: [
            { type: 'input', selector: 'input[aria-label="Name"]', value: 'Ada Lovelace' },
            { type: 'input', selector: 'input[aria-label="Email"]', value: 'ada@example.test' },
            { type: 'input', selector: 'textarea[aria-label="Message"]', value: 'Hello there' },
            { type: 'submit', selector: 'form' },
            { type: 'submit', selector: 'form' },
            { type: 'settle', callback: 'onSubmit' },
          ],
        },
        {
          name: 'a resolved submit shows the success content and clears the fields',
          props: { successContent: { $nodes: success } },
          callbacks: ['onSubmit'],
          callbackResults: { onSubmit: { resolve: undefined } },
          interactions: [
            { type: 'input', selector: 'input[aria-label="Name"]', value: 'Ada Lovelace' },
            { type: 'input', selector: 'input[aria-label="Email"]', value: 'ada@example.test' },
            { type: 'input', selector: 'textarea[aria-label="Message"]', value: 'Hello there' },
            { type: 'submit', selector: 'form' },
          ],
        },
        {
          name: 'a resolved submit without success content re-renders the empty form',
          props: {},
          callbacks: ['onSubmit'],
          callbackResults: { onSubmit: { resolve: undefined } },
          interactions: [
            { type: 'input', selector: 'input[aria-label="Name"]', value: 'Ada Lovelace' },
            { type: 'input', selector: 'input[aria-label="Email"]', value: 'ada@example.test' },
            { type: 'input', selector: 'textarea[aria-label="Message"]', value: 'Hello there' },
            { type: 'submit', selector: 'form' },
          ],
        },
        {
          name: 'a rejected submit shows the error message',
          props: { title: 'Contact us' },
          callbacks: ['onSubmit'],
          callbackResults: { onSubmit: { reject: 'Please try again later' } },
          interactions: [
            { type: 'input', selector: 'input[aria-label="Name"]', value: 'Ada Lovelace' },
            { type: 'input', selector: 'input[aria-label="Email"]', value: 'ada@example.test' },
            { type: 'input', selector: 'textarea[aria-label="Message"]', value: 'Hello there' },
            { type: 'submit', selector: 'form' },
          ],
        },
        {
          name: 'resubmitting clears the error and a success replaces the form',
          props: { successContent: { $nodes: success } },
          callbacks: ['onSubmit'],
          callbackResults: { onSubmit: { defer: true } },
          interactions: [
            { type: 'input', selector: 'input[aria-label="Name"]', value: 'Ada Lovelace' },
            { type: 'input', selector: 'input[aria-label="Email"]', value: 'ada@example.test' },
            { type: 'input', selector: 'textarea[aria-label="Message"]', value: 'Hello there' },
            { type: 'submit', selector: 'form' },
            { type: 'settle', callback: 'onSubmit', error: 'Please try again later' },
            { type: 'submit', selector: 'form' },
            { type: 'settle', callback: 'onSubmit' },
          ],
        },
        {
          name: 'prop changes while idle',
          props: {},
          interactions: [
            {
              type: 'props',
              props: {
                title: 'Contact us',
                description: 'we reply fast',
                submitLabel: 'Send now',
              },
            },
            { type: 'props', props: { title: null, description: null } },
          ],
        },
        {
          name: 'a className change after submit reaches the success wrapper',
          props: { successContent: { $nodes: success } },
          callbacks: ['onSubmit'],
          callbackResults: { onSubmit: { resolve: undefined } },
          interactions: [
            { type: 'submit', selector: 'form' },
            { type: 'props', props: { className: 'parity-token' } },
          ],
        },
      ],
    },
  ],
}
