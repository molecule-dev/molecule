/**
 * `@molecule/app-forum-thread-row-react` cases: the discussion-board thread row
 * — title, optional excerpt, vote score, reply/view counts, pin/lock badges,
 * author, timestamp, tags and an optional vote-controls slot.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** A vote-controls cluster, the way a caller fills the `voteControls` slot. */
const voteControls = [
  {
    tag: 'button',
    attrs: { type: 'button', 'data-votes': '' },
    children: ['▲'],
  },
]

/** Tag chips, the way a caller fills the `tags` slot. */
const tags = [
  { tag: 'span', attrs: { 'data-tag': '' }, children: ['help'] },
  { tag: 'span', attrs: { 'data-tag': '' }, children: ['account'] },
]

/** `@molecule/app-forum-thread-row-react`. */
export const forumThreadRowFeature: FeatureCases = {
  package: '@molecule/app-forum-thread-row-react',
  families: [
    {
      component: 'ForumThreadRow',
      cases: [
        { name: 'title only', props: { title: 'How do I reset my password?' } },
        {
          name: 'excerpt, score, counts, author and date',
          props: {
            title: 'How do I reset my password?',
            excerpt: 'I tried the forgot-password link but never received an email.',
            voteScore: 42,
            replyCount: 7,
            viewCount: 320,
            author: 'alice',
            createdAt: '2 hours ago',
          },
        },
        {
          name: 'pinned and locked badges',
          props: { title: 'T', pinned: true, locked: true },
        },
        {
          name: 'badges explicitly off',
          props: { title: 'T', pinned: false, locked: false },
        },
        {
          name: 'tags and voteControls slots',
          props: { title: 'T' },
          slots: { tags, voteControls },
        },
        {
          name: 'voteControls replaces the score block',
          props: { title: 'T', voteScore: 42 },
          slots: { voteControls },
        },
        {
          name: 'zero score and zero counts render',
          props: { title: 'T', voteScore: 0, replyCount: 0, viewCount: 0 },
        },
        {
          name: 'node title, excerpt and author',
          slots: {
            title: [{ tag: 'strong', children: ['Nested title'] }],
            excerpt: [{ tag: 'em', children: ['Nested excerpt'] }],
            author: [{ tag: 'code', children: ['bob'] }],
          },
        },
        {
          name: 'node createdAt and tags',
          props: { title: 'T' },
          slots: {
            createdAt: [{ tag: 'time', attrs: { 'data-when': '' }, children: ['yesterday'] }],
            tags,
          },
        },
        {
          name: 'empty strings omit their branches',
          props: { title: 'T', excerpt: '', author: '', createdAt: '' },
        },
        {
          name: 'everything together with className',
          props: {
            title: 'Thread title',
            excerpt: 'Body excerpt',
            voteScore: 11,
            replyCount: 3,
            viewCount: 88,
            pinned: true,
            locked: true,
            author: 'carol',
            createdAt: '3 days ago',
            className: 'parity-token',
          },
          slots: { tags },
        },
        {
          name: 'click calls onClick',
          props: { title: 'T' },
          callbacks: ['onClick'],
          interactions: [{ type: 'click', selector: 'article' }],
        },
        {
          name: 'clickable row forwards className',
          props: { title: 'T', className: 'parity-token' },
          callbacks: ['onClick'],
        },
        {
          name: 'non-clickable row forwards className',
          props: { title: 'T', className: 'parity-token' },
        },
        {
          name: 'props change score, badges and counts',
          props: { title: 'T', voteScore: 3, pinned: true },
          interactions: [
            { type: 'props', props: { voteScore: 9, pinned: false, locked: true, replyCount: 4 } },
          ],
        },
        {
          name: 'excerpt appears on a later render',
          props: { title: 'T' },
          interactions: [{ type: 'props', props: { excerpt: 'Added excerpt', author: 'dave' } }],
        },
      ],
    },
  ],
}
