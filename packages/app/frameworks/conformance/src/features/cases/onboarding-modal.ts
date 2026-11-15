/**
 * `@molecule/app-onboarding-modal-react` cases: the multi-step onboarding
 * overlay — each step's title, body and optional media, the jump-to-step dots,
 * the Skip / Back / Next / Get-started controls, and the uncontrolled step
 * state (`defaultStep`, advancing, going back, completing, closing).
 *
 * `OnboardingModal` is the package's only runtime export. `onClose` and
 * `onComplete` take no arguments, so their recorded calls are empty. The
 * overlay is React's `Modal` (a `document.body` portal), so its controls are
 * selected structurally inside `[role="dialog"]`.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** The footer's primary button: Next on any step but the last, Get started on it. */
const primarySelector = '[role="dialog"] footer button:last-child'
/** The Back button: the second footer button whenever it renders. */
const backSelector = '[role="dialog"] footer button:nth-child(2)'
/** The Skip button: the first footer button whenever it renders. */
const skipSelector = '[role="dialog"] footer button:first-child'
/** The dialog's floating chrome close button (`Modal`'s default). */
const chromeCloseSelector = '[data-mol-id="modal-close"]'

/** The three-step flow the React unit suite uses. */
const steps = [
  { id: 's1', title: 'Welcome', body: 'Step one body' },
  { id: 's2', title: 'Connect', body: 'Step two body' },
  { id: 's3', title: 'Done', body: 'Step three body' },
]

/** One step whose title, body and media are nodes (the kit's data-prop node markers). */
const nodeStep = {
  id: 'n1',
  title: 'Welcome aboard',
  body: 'Read the guide.',
  media: {
    $nodes: [{ tag: 'img', attrs: { 'data-media': '', src: '/welcome.png' } }],
  },
}

/** Two steps, the second of which is the last. */
const twoSteps = [
  { id: 't1', title: 'First', body: 'First body' },
  { id: 't2', title: 'Second', body: 'Second body' },
]

/** A single step — both the first and the last. */
const oneStep = [{ id: 'o1', title: 'Only', body: 'Only body' }]

/** `@molecule/app-onboarding-modal-react`. */
export const onboardingModalFeature: FeatureCases = {
  package: '@molecule/app-onboarding-modal-react',
  families: [
    {
      component: 'OnboardingModal',
      cases: [
        {
          name: 'defaults: the first step with Skip and Next',
          props: { open: true, steps },
          callbacks: ['onClose', 'onComplete'],
        },
        {
          name: 'closed renders nothing',
          props: { open: false, steps },
          callbacks: ['onClose', 'onComplete'],
        },
        {
          name: 'no steps renders nothing',
          props: { open: true, steps: [] },
          callbacks: ['onClose', 'onComplete'],
        },
        {
          name: 'a single step is already the last step',
          props: { open: true, steps: oneStep },
          callbacks: ['onClose', 'onComplete'],
        },
        {
          name: 'defaultStep selects a middle step',
          props: { open: true, steps, defaultStep: 1 },
          callbacks: ['onClose', 'onComplete'],
        },
        {
          name: 'defaultStep on the last step shows Get started and no Skip',
          props: { open: true, steps, defaultStep: 2 },
          callbacks: ['onClose', 'onComplete'],
        },
        {
          name: 'a defaultStep past the end clamps the content to the last step',
          props: { open: true, steps, defaultStep: 9 },
          callbacks: ['onClose', 'onComplete'],
        },
        {
          name: 'a negative defaultStep clamps the content to the first step',
          props: { open: true, steps, defaultStep: -2 },
          callbacks: ['onClose', 'onComplete'],
        },
        {
          name: 'allowSkip false hides Skip on a middle step',
          props: { open: true, steps, allowSkip: false },
          callbacks: ['onClose', 'onComplete'],
        },
        {
          name: 'allowSkip false on the last step shows only Get started',
          props: { open: true, steps, defaultStep: 2, allowSkip: false },
          callbacks: ['onClose', 'onComplete'],
        },
        {
          name: 'node title and body',
          props: {
            open: true,
            steps: [
              {
                id: 'n1',
                title: { $nodes: [{ tag: 'em', children: ['Welcome'] }, ' aboard'] },
                body: { $nodes: ['Read the ', { tag: 'strong', children: ['guide'] }, '.'] },
              },
            ],
          },
          callbacks: ['onClose', 'onComplete'],
        },
        {
          name: 'an image media node',
          props: { open: true, steps: [nodeStep] },
          callbacks: ['onClose', 'onComplete'],
        },
        {
          name: 'plain-text media renders inside the media wrapper',
          props: {
            open: true,
            steps: [{ id: 'm1', title: 'T', body: 'B', media: { $nodes: ['Illustration'] } }],
          },
          callbacks: ['onClose', 'onComplete'],
        },
        {
          name: 'clicking Next advances to the second step',
          props: { open: true, steps },
          callbacks: ['onClose', 'onComplete'],
          interactions: [{ type: 'click', selector: primarySelector }],
        },
        {
          name: 'clicking Next twice reaches the last step',
          props: { open: true, steps },
          callbacks: ['onClose', 'onComplete'],
          interactions: [
            { type: 'click', selector: primarySelector },
            { type: 'click', selector: primarySelector },
          ],
        },
        {
          name: 'clicking Back returns to the previous step',
          props: { open: true, steps, defaultStep: 1 },
          callbacks: ['onClose', 'onComplete'],
          interactions: [{ type: 'click', selector: backSelector }],
        },
        {
          name: 'clicking Back on the last step returns to the middle step',
          props: { open: true, steps, defaultStep: 2 },
          callbacks: ['onClose', 'onComplete'],
          interactions: [{ type: 'click', selector: backSelector }],
        },
        {
          name: 'clicking Skip calls onClose',
          props: { open: true, steps },
          callbacks: ['onClose', 'onComplete'],
          interactions: [{ type: 'click', selector: skipSelector }],
        },
        {
          name: 'completing the last step calls onComplete then onClose',
          props: { open: true, steps, defaultStep: 2 },
          callbacks: ['onClose', 'onComplete'],
          interactions: [{ type: 'click', selector: primarySelector }],
        },
        {
          name: 'completing without onComplete still calls onClose',
          props: { open: true, steps, defaultStep: 2 },
          callbacks: ['onClose'],
          interactions: [{ type: 'click', selector: primarySelector }],
        },
        {
          name: 'advancing from the second of two steps completes at once',
          props: { open: true, steps: twoSteps, defaultStep: 1 },
          callbacks: ['onClose', 'onComplete'],
          interactions: [{ type: 'click', selector: primarySelector }],
        },
        {
          name: 'escape calls onClose',
          props: { open: true, steps },
          callbacks: ['onClose', 'onComplete'],
          interactions: [{ type: 'keydown', selector: '[role="dialog"]', key: 'Escape' }],
        },
        {
          name: 'the chrome close button calls onClose',
          props: { open: true, steps },
          callbacks: ['onClose', 'onComplete'],
          interactions: [{ type: 'click', selector: chromeCloseSelector }],
        },
        {
          name: 'prop changes: open false hides the overlay',
          props: { open: true, steps },
          callbacks: ['onClose', 'onComplete'],
          interactions: [{ type: 'props', props: { open: false } }],
        },
        {
          name: 'prop changes: open true reveals the overlay',
          props: { open: false, steps },
          callbacks: ['onClose', 'onComplete'],
          interactions: [{ type: 'props', props: { open: true } }],
        },
        {
          name: 'prop changes: more steps turn the last step into a middle one',
          props: { open: true, steps: twoSteps, defaultStep: 1 },
          callbacks: ['onClose', 'onComplete'],
          interactions: [{ type: 'props', props: { steps } }],
        },
        {
          name: 'prop changes: fewer steps clamp a step index past the new end',
          props: { open: true, steps, defaultStep: 2 },
          callbacks: ['onClose', 'onComplete'],
          interactions: [{ type: 'props', props: { steps: oneStep } }],
        },
        {
          name: 'prop changes: steps emptied render nothing',
          props: { open: true, steps },
          callbacks: ['onClose', 'onComplete'],
          interactions: [{ type: 'props', props: { steps: [] } }],
        },
        {
          name: 'prop changes: allowSkip toggling hides Skip',
          props: { open: true, steps },
          callbacks: ['onClose', 'onComplete'],
          interactions: [{ type: 'props', props: { allowSkip: false } }],
        },
        {
          name: 'prop changes: defaultStep is ignored after mount',
          props: { open: true, steps },
          callbacks: ['onClose', 'onComplete'],
          interactions: [{ type: 'props', props: { defaultStep: 2 } }],
        },
        {
          name: 'the step persists across an unrelated prop change',
          props: { open: true, steps },
          callbacks: ['onClose', 'onComplete'],
          interactions: [
            { type: 'click', selector: primarySelector },
            { type: 'props', props: { steps: [...steps] } },
          ],
        },
      ],
    },
  ],
}
