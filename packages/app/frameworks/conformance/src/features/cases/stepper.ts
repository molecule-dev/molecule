/**
 * `@molecule/app-stepper-react` cases: the multi-step progress indicator — the
 * `dots`, `bar` and `cards` variants, horizontal and vertical, with derived and
 * explicit step statuses and the variant-dependent click handler.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** The three steps the React unit suite uses. */
const steps = [
  { id: 'a', label: 'Cart' },
  { id: 'b', label: 'Shipping' },
  { id: 'c', label: 'Payment' },
]

/** Two steps, for interactions that change the list. */
const twoSteps = [
  { id: 'a', label: 'Cart' },
  { id: 'b', label: 'Shipping' },
]

/** `@molecule/app-stepper-react`. */
export const stepperFeature: FeatureCases = {
  package: '@molecule/app-stepper-react',
  families: [
    {
      component: 'Stepper',
      cases: [
        // dots — the default variant.
        { name: 'dots: default variant, no handler', props: { steps, currentStep: 1 } },
        {
          name: 'dots: clicking any step reports its id and index',
          props: { steps, currentStep: 1 },
          callbacks: ['onStepClick'],
          interactions: [
            { type: 'click', selector: 'button[data-mol-id="stepper-step-a"]' },
            { type: 'click', selector: 'button[data-mol-id="stepper-step-b"]' },
            { type: 'click', selector: 'button[data-mol-id="stepper-step-c"]' },
          ],
        },
        {
          name: 'dots: vertical orientation drops the connectors',
          props: { steps, currentStep: 1, orientation: 'vertical' },
        },
        {
          name: 'dots: explicit statuses override the derived ones',
          props: {
            steps: [
              { id: 'a', label: 'One', status: 'pending' },
              { id: 'b', label: 'Two', status: 'completed' },
              { id: 'c', label: 'Three', status: 'error' },
              { id: 'd', label: 'Four', status: 'current' },
            ],
            currentStep: 0,
          },
        },
        {
          name: 'dots: node labels and descriptions',
          props: {
            steps: [
              { id: 'a', label: { $nodes: [{ tag: 'strong', children: ['Cart'] }] } },
              { id: 'b', label: 'Shipping', description: 'Add an address' },
              {
                id: 'c',
                label: { $nodes: [{ tag: 'em', children: ['Payment'] }] },
                description: { $nodes: [{ tag: 'small', children: ['Card details'] }] },
              },
            ],
            currentStep: 2,
          },
        },
        {
          name: 'dots: className passthrough',
          props: { steps, currentStep: 0, className: 'stp-cls' },
        },
        {
          name: 'dots: currentStep changes',
          props: { steps, currentStep: 0 },
          interactions: [{ type: 'props', props: { currentStep: 2 } }],
        },
        {
          name: 'dots: the steps change',
          props: { steps, currentStep: 1 },
          interactions: [{ type: 'props', props: { steps: twoSteps } }],
        },
        {
          name: 'dots: no steps',
          props: { steps: [], currentStep: 0 },
        },
        {
          name: 'dots: a click handler with no interaction',
          props: { steps, currentStep: 2 },
          callbacks: ['onStepClick'],
        },

        // cards.
        {
          name: 'cards: default variant, no handler',
          props: { steps, currentStep: 0, variant: 'cards' },
        },
        {
          name: 'cards: only completed steps are clickable',
          props: { steps, currentStep: 2, variant: 'cards' },
          callbacks: ['onStepClick'],
          interactions: [
            { type: 'click', selector: 'button[data-mol-id="stepper-step-a"]' },
            { type: 'click', selector: 'button[data-mol-id="stepper-step-b"]' },
            { type: 'click', selector: 'button[data-mol-id="stepper-step-c"]' },
          ],
        },
        {
          name: 'cards: an explicit completed status is clickable ahead of currentStep',
          props: {
            steps: [
              { id: 'a', label: 'Cart' },
              { id: 'b', label: 'Shipping', status: 'completed' },
              { id: 'c', label: 'Payment', status: 'error' },
            ],
            currentStep: 0,
            variant: 'cards',
          },
          callbacks: ['onStepClick'],
          interactions: [{ type: 'click', selector: 'button[data-mol-id="stepper-step-b"]' }],
        },
        {
          name: 'cards: vertical orientation stacks the cards',
          props: { steps, currentStep: 1, variant: 'cards', orientation: 'vertical' },
        },
        {
          name: 'cards: descriptions, as text and as nodes',
          props: {
            steps: [
              { id: 'a', label: 'Cart', description: 'Two items' },
              { id: 'b', label: { $nodes: [{ tag: 'strong', children: ['Shipping'] }] } },
              {
                id: 'c',
                label: 'Payment',
                description: { $nodes: [{ tag: 'small', children: ['Card details'] }] },
              },
            ],
            currentStep: 1,
            variant: 'cards',
          },
        },
        {
          name: 'cards: className passthrough',
          props: { steps, currentStep: 1, variant: 'cards', className: 'stp-cards' },
        },
        {
          name: 'cards: no steps',
          props: { steps: [], currentStep: 0, variant: 'cards' },
        },

        // bar.
        {
          name: 'bar: a filled bar and the step labels',
          props: { steps, currentStep: 1, variant: 'bar' },
        },
        {
          name: 'bar: a single step is full',
          props: { steps: [{ id: 'a', label: 'Only' }], currentStep: 0, variant: 'bar' },
        },
        { name: 'bar: the first step is empty', props: { steps, currentStep: 0, variant: 'bar' } },
        { name: 'bar: the last step is full', props: { steps, currentStep: 2, variant: 'bar' } },
        {
          name: 'bar: node labels, descriptions and statuses',
          props: {
            steps: [
              { id: 'a', label: { $nodes: [{ tag: 'strong', children: ['Cart'] }] } },
              { id: 'b', label: 'Shipping', description: 'Ignored here', status: 'completed' },
              { id: 'c', label: 'Payment', status: 'error' },
            ],
            currentStep: 1,
            variant: 'bar',
          },
        },
        {
          name: 'bar: className passthrough',
          props: { steps, currentStep: 1, variant: 'bar', className: 'stp-bar' },
        },
        {
          name: 'bar: orientation does not change the markup',
          props: { steps, currentStep: 1, variant: 'bar', orientation: 'vertical' },
        },
        {
          name: 'bar: currentStep changes',
          props: { steps, currentStep: 1, variant: 'bar' },
          interactions: [{ type: 'props', props: { currentStep: 2 } }],
        },
        {
          name: 'bar: no steps',
          props: { steps: [], currentStep: 0, variant: 'bar' },
        },

        // The variant itself is a prop: changing it re-renders the other branch.
        {
          name: 'the variant changes',
          props: { steps, currentStep: 1 },
          interactions: [{ type: 'props', props: { variant: 'cards' } }],
        },
      ],
    },
  ],
}
