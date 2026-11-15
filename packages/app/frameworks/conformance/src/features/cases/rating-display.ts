/**
 * `@molecule/app-rating-display-react` cases: the fractional star rating, its
 * optional review-count tail and its optional interactive mode.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

// `RatingDisplay` mints each star's SVG gradient id with `Math.random()`, so
// the DOM it renders differs on every run and no committed reference could
// ever match it. Pin `Math.random` to one constant while these cases are
// loaded: the reference recording, every later comparison and every framework
// port then mint the same id. The id is internal to the SVG — the DOM
// normalizer renumbers `id` attributes — so pinning it changes no rendered
// pixel and no compared attribute except that shared token.
Math.random = () => 0.123456789

/** `@molecule/app-rating-display-react`. */
export const ratingDisplayFeature: FeatureCases = {
  package: '@molecule/app-rating-display-react',
  families: [
    {
      component: 'RatingDisplay',
      cases: [
        { name: 'defaults', props: { value: 3.5 } },
        { name: 'zero value', props: { value: 0 } },
        { name: 'whole value', props: { value: 3 } },
        { name: 'fractional value', props: { value: 2.4 } },
        { name: 'value above max', props: { value: 6 } },
        { name: 'negative value', props: { value: -1 } },
        { name: 'custom max', props: { value: 2.5, max: 3 } },
        { name: 'max zero', props: { value: 2, max: 0 } },
        { name: 'small size', props: { value: 4, size: 'sm' } },
        { name: 'medium size', props: { value: 4, size: 'md' } },
        { name: 'large size', props: { value: 4, size: 'lg' } },
        { name: 'unknown size', props: { value: 4, size: 'xl' } },
        { name: 'custom aria label', props: { value: 4, ariaLabel: 'Four stars' } },
        { name: 'extra class', props: { value: 3, className: 'parity-token' } },
        { name: 'review count as text', props: { value: 4, reviewCount: 128 } },
        { name: 'zero review count', props: { value: 4, reviewCount: 0 } },
        {
          name: 'review count as a button',
          props: { value: 4, reviewCount: 128 },
          callbacks: ['onReviewsClick'],
          interactions: [{ type: 'click', selector: 'button' }],
        },
        {
          name: 'interactive stars',
          props: { value: 2 },
          callbacks: ['onChange'],
          interactions: [
            { type: 'click', selector: 'button:nth-of-type(1)' },
            { type: 'click', selector: 'button:nth-of-type(3)' },
            { type: 'click', selector: 'button:nth-of-type(5)' },
          ],
        },
        {
          name: 'interactive with a review count',
          props: { value: 3, reviewCount: 12 },
          callbacks: ['onChange', 'onReviewsClick'],
          interactions: [{ type: 'click', selector: 'button:nth-of-type(6)' }],
        },
        {
          name: 'interactive with a custom max',
          props: { value: 5, max: 10 },
          callbacks: ['onChange'],
          interactions: [
            { type: 'click', selector: 'button:nth-of-type(10)' },
            { type: 'click', selector: 'button:nth-of-type(7)' },
          ],
        },
        {
          name: 'value changes',
          props: { value: 1 },
          interactions: [{ type: 'props', props: { value: 4.5 } }],
        },
        {
          name: 'interactive value changes after a click',
          props: { value: 1 },
          callbacks: ['onChange'],
          interactions: [
            { type: 'click', selector: 'button:nth-of-type(2)' },
            { type: 'props', props: { value: 4 } },
          ],
        },
        {
          name: 'size changes',
          props: { value: 4, size: 'sm' },
          interactions: [{ type: 'props', props: { size: 'lg' } }],
        },
        {
          name: 'max and review count change',
          props: { value: 2, max: 3, reviewCount: 5 },
          interactions: [{ type: 'props', props: { max: 6, reviewCount: 9 } }],
        },
        {
          name: 'review count removed',
          props: { value: 3, reviewCount: 9 },
          interactions: [{ type: 'props', props: { reviewCount: undefined } }],
        },
        {
          name: 'every prop',
          props: {
            value: 4.5,
            max: 5,
            reviewCount: 42,
            size: 'lg',
            ariaLabel: 'Score',
            className: 'all-props',
          },
          callbacks: ['onChange', 'onReviewsClick'],
          interactions: [
            { type: 'click', selector: 'button:nth-of-type(3)' },
            { type: 'click', selector: 'button:nth-of-type(6)' },
          ],
        },
      ],
    },
  ],
}
