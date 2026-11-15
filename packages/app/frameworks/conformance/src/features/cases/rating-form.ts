/**
 * `@molecule/app-rating-form-react` cases: the star radiogroup, the comment
 * textarea, the submit button and the form's own hover / submitting / blocked
 * states.
 *
 * `onSubmit` is the only callback; a deferred one holds the form in its
 * submitting state, and a resolved one returns it to idle. `defaultRating` is
 * an UNCONTROLLED initial value, so a later prop change must not move the
 * selection.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

const titleNode = [{ tag: 'strong', children: ['Rate us'] }]
const submitLabelNode = [{ tag: 'em', children: ['Post review'] }]

/** `@molecule/app-rating-form-react`. */
export const ratingFormFeature: FeatureCases = {
  package: '@molecule/app-rating-form-react',
  families: [
    {
      component: 'RatingForm',
      cases: [
        { name: 'defaults', callbacks: ['onSubmit'] },
        { name: 'custom max', props: { max: 3 }, callbacks: ['onSubmit'] },
        { name: 'max zero renders no stars', props: { max: 0 }, callbacks: ['onSubmit'] },
        {
          name: 'a default rating marks its star',
          props: { defaultRating: 3 },
          callbacks: ['onSubmit'],
        },
        {
          name: 'a default rating above max marks nothing',
          props: { defaultRating: 9 },
          callbacks: ['onSubmit'],
        },
        { name: 'title as text', props: { title: 'Rate us' }, callbacks: ['onSubmit'] },
        {
          name: 'title as a node',
          props: { title: { $nodes: titleNode } },
          callbacks: ['onSubmit'],
        },
        {
          name: 'an empty title renders no heading',
          props: { title: '' },
          callbacks: ['onSubmit'],
        },
        {
          name: 'a custom comment placeholder',
          props: { commentPlaceholder: 'Tell us more' },
          callbacks: ['onSubmit'],
        },
        {
          name: 'a custom submit label',
          props: { submitLabel: 'Post review' },
          callbacks: ['onSubmit'],
        },
        {
          name: 'a submit label as a node',
          props: { submitLabel: { $nodes: submitLabelNode } },
          callbacks: ['onSubmit'],
        },
        {
          name: 'an empty submit label still wins over the default',
          props: { submitLabel: '' },
          callbacks: ['onSubmit'],
        },
        {
          name: 'a required comment',
          props: { requireComment: true },
          callbacks: ['onSubmit'],
        },
        {
          name: 'extra classes on the form',
          props: { className: 'parity-token' },
          callbacks: ['onSubmit'],
        },
        {
          name: 'clicking a star selects it',
          callbacks: ['onSubmit'],
          interactions: [
            { type: 'click', selector: '[data-mol-id="rating-form-star"]:nth-of-type(3)' },
          ],
        },
        {
          name: 'the selection moves to the last star',
          props: { defaultRating: 1 },
          callbacks: ['onSubmit'],
          interactions: [
            { type: 'click', selector: '[data-mol-id="rating-form-star"]:nth-of-type(5)' },
            { type: 'click', selector: '[data-mol-id="rating-form-star"]:nth-of-type(2)' },
          ],
        },
        {
          name: 'hovering a star previews the fill and leaving restores it',
          props: { defaultRating: 2 },
          callbacks: ['onSubmit'],
          interactions: [
            { type: 'mouseenter', selector: '[data-mol-id="rating-form-star"]:nth-of-type(5)' },
            { type: 'mouseleave', selector: '[role="radiogroup"]' },
          ],
        },
        {
          name: 'a hover does not change the selection',
          props: { defaultRating: 2 },
          callbacks: ['onSubmit'],
          interactions: [
            { type: 'mouseenter', selector: '[data-mol-id="rating-form-star"]:nth-of-type(4)' },
            { type: 'click', selector: '[data-mol-id="rating-form-star"]:nth-of-type(4)' },
            { type: 'mouseleave', selector: '[role="radiogroup"]' },
          ],
        },
        {
          name: 'a key press does not change the selection',
          props: { defaultRating: 2 },
          callbacks: ['onSubmit'],
          interactions: [{ type: 'keydown', selector: 'form', key: 'ArrowRight' }],
        },
        {
          name: 'typing a comment',
          callbacks: ['onSubmit'],
          interactions: [{ type: 'input', selector: 'textarea', value: 'Lovely app' }],
        },
        {
          name: 'submitting calls onSubmit with the rating and comment',
          callbacks: ['onSubmit'],
          interactions: [
            { type: 'click', selector: '[data-mol-id="rating-form-star"]:nth-of-type(4)' },
            { type: 'input', selector: 'textarea', value: 'Works great' },
            { type: 'submit', selector: 'form' },
          ],
        },
        {
          name: 'submitting without a comment',
          callbacks: ['onSubmit'],
          interactions: [
            { type: 'click', selector: '[data-mol-id="rating-form-star"]:nth-of-type(2)' },
            { type: 'submit', selector: 'form' },
          ],
        },
        {
          name: 'a submit without a rating is ignored',
          callbacks: ['onSubmit'],
          interactions: [{ type: 'submit', selector: 'form' }],
        },
        {
          name: 'a required comment blocks a blank submit',
          props: { requireComment: true },
          callbacks: ['onSubmit'],
          interactions: [
            { type: 'click', selector: '[data-mol-id="rating-form-star"]:nth-of-type(3)' },
            { type: 'submit', selector: 'form' },
          ],
        },
        {
          name: 'a required comment accepts whitespace-trimmed text',
          props: { requireComment: true },
          callbacks: ['onSubmit'],
          interactions: [
            { type: 'click', selector: '[data-mol-id="rating-form-star"]:nth-of-type(3)' },
            { type: 'input', selector: 'textarea', value: '  Nice  ' },
            { type: 'submit', selector: 'form' },
          ],
        },
        {
          name: 'a required comment still blocks a whitespace-only comment',
          props: { requireComment: true },
          callbacks: ['onSubmit'],
          interactions: [
            { type: 'click', selector: '[data-mol-id="rating-form-star"]:nth-of-type(3)' },
            { type: 'input', selector: 'textarea', value: '   ' },
            { type: 'submit', selector: 'form' },
          ],
        },
        {
          name: 'submitting shows the pending label and disables the button',
          callbacks: ['onSubmit'],
          callbackResults: { onSubmit: { defer: true } },
          interactions: [
            { type: 'click', selector: '[data-mol-id="rating-form-star"]:nth-of-type(4)' },
            { type: 'input', selector: 'textarea', value: 'Works great' },
            { type: 'submit', selector: 'form' },
          ],
        },
        {
          name: 'a settled submit returns the form to idle',
          callbacks: ['onSubmit'],
          callbackResults: { onSubmit: { defer: true } },
          interactions: [
            { type: 'click', selector: '[data-mol-id="rating-form-star"]:nth-of-type(4)' },
            { type: 'submit', selector: 'form' },
            { type: 'settle', callback: 'onSubmit' },
          ],
        },
        {
          name: 'a second submit while pending is ignored',
          callbacks: ['onSubmit'],
          callbackResults: { onSubmit: { defer: true } },
          interactions: [
            { type: 'click', selector: '[data-mol-id="rating-form-star"]:nth-of-type(4)' },
            { type: 'submit', selector: 'form' },
            { type: 'submit', selector: 'form' },
            { type: 'settle', callback: 'onSubmit' },
          ],
        },
        {
          name: 'a resolved submit keeps the selection and comment',
          callbacks: ['onSubmit'],
          callbackResults: { onSubmit: { resolve: undefined } },
          interactions: [
            { type: 'click', selector: '[data-mol-id="rating-form-star"]:nth-of-type(5)' },
            { type: 'input', selector: 'textarea', value: 'Excellent' },
            { type: 'submit', selector: 'form' },
          ],
        },
        {
          name: 'the uncontrolled default rating does not follow a prop change',
          props: { defaultRating: 2 },
          callbacks: ['onSubmit'],
          interactions: [
            { type: 'click', selector: '[data-mol-id="rating-form-star"]:nth-of-type(5)' },
            { type: 'props', props: { defaultRating: 1 } },
            { type: 'props', props: { defaultRating: 3 } },
          ],
        },
        {
          name: 'the star count changes',
          props: { max: 3 },
          callbacks: ['onSubmit'],
          interactions: [{ type: 'props', props: { max: 6 } }],
        },
        {
          name: 'a title appears and is removed',
          props: {},
          callbacks: ['onSubmit'],
          interactions: [
            { type: 'props', props: { title: 'Rate us' } },
            { type: 'props', props: { title: null } },
          ],
        },
        {
          name: 'the comment placeholder and submit label change',
          props: {},
          callbacks: ['onSubmit'],
          interactions: [
            { type: 'props', props: { commentPlaceholder: 'Tell us more', submitLabel: 'Post' } },
            { type: 'props', props: { commentPlaceholder: undefined, submitLabel: undefined } },
          ],
        },
        {
          name: 'requireComment turns on and off',
          props: {},
          callbacks: ['onSubmit'],
          interactions: [
            { type: 'props', props: { requireComment: true } },
            { type: 'props', props: { requireComment: false } },
          ],
        },
        {
          name: 'every prop',
          props: {
            max: 4,
            defaultRating: 2,
            requireComment: true,
            title: 'Rate us',
            commentPlaceholder: 'Tell us more',
            submitLabel: 'Post review',
            className: 'parity-token',
          },
          callbacks: ['onSubmit'],
          interactions: [
            { type: 'mouseenter', selector: '[data-mol-id="rating-form-star"]:nth-of-type(4)' },
            { type: 'click', selector: '[data-mol-id="rating-form-star"]:nth-of-type(3)' },
            { type: 'input', selector: 'textarea', value: 'All props' },
            { type: 'mouseleave', selector: '[role="radiogroup"]' },
            { type: 'submit', selector: 'form' },
          ],
        },
      ],
    },
  ],
}
