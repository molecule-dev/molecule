/**
 * `@molecule/app-vote-cluster-react` cases: the stacked up/down arrows with a
 * score readout between them.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** `@molecule/app-vote-cluster-react`. */
export const voteClusterFeature: FeatureCases = {
  package: '@molecule/app-vote-cluster-react',
  families: [
    {
      component: 'VoteCluster',
      cases: [
        { name: 'default', props: { score: 42 }, callbacks: ['onVote'] },
        { name: 'negative score', props: { score: -7 }, callbacks: ['onVote'] },
        {
          name: 'explicit aria label',
          props: { score: 1, ariaLabel: 'Vote on post' },
          callbacks: ['onVote'],
        },
        {
          name: 'agent id and classes',
          props: { score: 0, dataMolId: 'post-vote', className: 'parity-token' },
          callbacks: ['onVote'],
        },
        {
          name: 'horizontal direction',
          props: { score: 3, direction: 'horizontal' },
          callbacks: ['onVote'],
        },
        {
          name: 'controlled upvote',
          props: { score: 5, myVote: 1 },
          callbacks: ['onVote'],
        },
        {
          name: 'controlled downvote',
          props: { score: 5, myVote: -1 },
          callbacks: ['onVote'],
        },
        {
          name: 'controlled cleared',
          props: { score: 5, myVote: 0 },
          callbacks: ['onVote'],
        },
        {
          name: 'default vote up',
          props: { score: 5, defaultVote: 1 },
          callbacks: ['onVote'],
          interactions: [{ type: 'click', selector: '[data-vote="up"]' }],
        },
        {
          name: 'default vote down',
          props: { score: 5, defaultVote: -1 },
          callbacks: ['onVote'],
          interactions: [{ type: 'click', selector: '[data-vote="down"]' }],
        },
        {
          name: 'up arrow toggles',
          props: { score: 5 },
          callbacks: ['onVote'],
          interactions: [
            { type: 'click', selector: '[data-vote="up"]' },
            { type: 'click', selector: '[data-vote="up"]' },
          ],
        },
        {
          name: 'down arrow toggles',
          props: { score: 5 },
          callbacks: ['onVote'],
          interactions: [
            { type: 'click', selector: '[data-vote="down"]' },
            { type: 'click', selector: '[data-vote="down"]' },
          ],
        },
        {
          name: 'swaps from up to down',
          props: { score: 5 },
          callbacks: ['onVote'],
          interactions: [
            { type: 'click', selector: '[data-vote="up"]' },
            { type: 'click', selector: '[data-vote="down"]' },
          ],
        },
        {
          name: 'controlled click leaves the arrows alone',
          props: { score: 5, myVote: 0 },
          callbacks: ['onVote'],
          interactions: [
            { type: 'click', selector: '[data-vote="up"]' },
            { type: 'click', selector: '[data-vote="down"]' },
          ],
        },
        {
          name: 'prop changes move the pressed arrow',
          props: { score: 5, myVote: 0 },
          callbacks: ['onVote'],
          interactions: [
            { type: 'props', props: { myVote: 1 } },
            { type: 'props', props: { myVote: -1 } },
            { type: 'props', props: { myVote: 0 } },
          ],
        },
        {
          name: 'disabled',
          props: { score: 5, disabled: true },
          callbacks: ['onVote'],
          interactions: [
            { type: 'click', selector: '[data-vote="up"]' },
            { type: 'click', selector: '[data-vote="down"]' },
          ],
        },
        {
          name: 'disabled through a prop change',
          props: { score: 5 },
          callbacks: ['onVote'],
          interactions: [
            { type: 'props', props: { disabled: true } },
            { type: 'click', selector: '[data-vote="up"]' },
            { type: 'props', props: { disabled: false } },
            { type: 'click', selector: '[data-vote="down"]' },
          ],
        },
      ],
    },
  ],
}
