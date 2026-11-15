/**
 * `@molecule/app-leaderboard-row-react` cases: rank + avatar + name + score
 * with an optional rank-delta indicator, subtitle and current-user highlight.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** `@molecule/app-leaderboard-row-react`. */
export const leaderboardRowFeature: FeatureCases = {
  package: '@molecule/app-leaderboard-row-react',
  families: [
    {
      component: 'LeaderboardRow',
      cases: [
        {
          name: 'name, score and avatar',
          props: { rank: 5, name: 'Zoe', avatarSrc: '/avatars/zoe.png', score: '1,200' },
        },
        { name: 'no avatar src', props: { rank: 4, name: 'Bo', score: 980 } },
        { name: 'gold medal for rank 1', props: { rank: 1, name: 'Alice', score: 4820 } },
        { name: 'silver medal for rank 2', props: { rank: 2, name: 'Bo', score: 4515 } },
        { name: 'bronze medal for rank 3', props: { rank: 3, name: 'Cy', score: 3907 } },
        { name: 'numeric rank past the podium', props: { rank: 8, name: 'Dee', score: 120 } },
        { name: 'rank zero and a zero score', props: { rank: 0, name: 'Eve', score: 0 } },
        { name: 'subtitle', props: { rank: 4, name: 'A', score: '9', subtitle: 'Team Red' } },
        {
          name: 'empty subtitle renders nothing',
          props: { rank: 4, name: 'A', score: '9', subtitle: '' },
        },
        {
          name: 'node name and node score',
          props: { rank: 2 },
          slots: {
            name: [{ tag: 'strong', children: ['Nova'] }],
            score: [{ tag: 'em', children: ['50 pts'] }],
          },
        },
        {
          name: 'node subtitle',
          props: { rank: 4, name: 'A', score: '9' },
          slots: { subtitle: [{ tag: 'em', children: ['Team Phoenix'] }] },
        },
        { name: 'climbing delta', props: { rank: 4, name: 'A', score: '9', rankDelta: 2 } },
        { name: 'falling delta', props: { rank: 4, name: 'A', score: '9', rankDelta: -3 } },
        {
          name: 'zero delta renders nothing',
          props: { rank: 4, name: 'A', score: '9', rankDelta: 0 },
        },
        {
          name: 'highlighted as the current user',
          props: { rank: 4, name: 'A', score: '9', isMe: true },
        },
        {
          name: 'isMe false has no highlight',
          props: { rank: 4, name: 'A', score: '9', isMe: false },
        },
        {
          name: 'className passthrough',
          props: { rank: 4, name: 'A', score: '9', className: 'parity-token' },
        },
        {
          name: 'clickable row calls onClick',
          props: { rank: 4, name: 'A', score: '9' },
          callbacks: ['onClick'],
          interactions: [{ type: 'click', selector: 'span' }],
        },
        {
          name: 'delta flips',
          props: { rank: 4, name: 'A', score: '9', rankDelta: 2 },
          interactions: [{ type: 'props', props: { rankDelta: -3 } }],
        },
        {
          name: 'delta disappears on a later render',
          props: { rank: 4, name: 'A', score: '9', rankDelta: 2 },
          interactions: [{ type: 'props', props: { rankDelta: 0 } }],
        },
        {
          name: 'delta appears on a later render',
          props: { rank: 4, name: 'A', score: '9' },
          interactions: [{ type: 'props', props: { rankDelta: -1 } }],
        },
        {
          name: 'highlight toggles off',
          props: { rank: 4, name: 'A', score: '9', isMe: true },
          interactions: [{ type: 'props', props: { isMe: false } }],
        },
        {
          name: 'subtitle appears on a later render',
          props: { rank: 4, name: 'A', score: '9' },
          interactions: [{ type: 'props', props: { subtitle: 'Team Nova' } }],
        },
        {
          name: 'rank and name change',
          props: { rank: 4, name: 'Before', score: '9' },
          interactions: [
            { type: 'props', props: { rank: 1, name: 'After' } },
            { type: 'props', props: { rank: 3, name: 'Third' } },
          ],
        },
        {
          name: 'everything at once, clicked on a child',
          props: {
            rank: 1,
            name: 'Alice Chen',
            avatarSrc: '/avatars/alice.png',
            score: 4820,
            rankDelta: 2,
            subtitle: 'Team Phoenix',
            className: 'parity-token',
          },
          callbacks: ['onClick'],
          interactions: [{ type: 'click', selector: 'span' }],
        },
      ],
    },
  ],
}
