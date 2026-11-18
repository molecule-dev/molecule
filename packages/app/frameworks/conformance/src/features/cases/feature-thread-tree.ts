/**
 * `@molecule/app-feature-thread-tree-react` cases: the recursive comment tree,
 * its per-node collapse state, the depth-based indentation, and the reply /
 * upvote slots.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** One comment with a plain-text body and no optional fields. */
const leaf = (id: string, author: string, body: string): Record<string, unknown> => ({
  id,
  author,
  body,
})

/** A two-level thread: `c1` with two replies, one of which has its own reply. */
const thread = [
  {
    id: 'c1',
    author: 'alice',
    body: 'Top level',
    score: 12,
    createdAt: '2 hours ago',
    children: [
      {
        id: 'c1-1',
        author: 'bob',
        body: 'First reply',
        score: 4,
        upvoted: true,
        children: [{ id: 'c1-1-1', author: 'carol', body: 'Deep reply' }],
      },
      leaf('c1-2', 'dave', 'Sibling reply'),
    ],
  },
  leaf('c2', 'eve', 'Another top-level'),
]

/** A single chain `d0 → … → d6`, so depth 4 has children and two descendants. */
const deepChain = {
  id: 'd0',
  author: 'a0',
  body: 'level 0',
  children: [
    {
      id: 'd1',
      author: 'a1',
      body: 'level 1',
      children: [
        {
          id: 'd2',
          author: 'a2',
          body: 'level 2',
          children: [
            {
              id: 'd3',
              author: 'a3',
              body: 'level 3',
              children: [
                {
                  id: 'd4',
                  author: 'a4',
                  body: 'level 4',
                  children: [
                    {
                      id: 'd5',
                      author: 'a5',
                      body: 'level 5',
                      children: [leaf('d6', 'a6', 'level 6')],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}

/** A chain `n0 → … → n9`, so nodes at depth 8 and 9 hit the indent clamp. */
const veryDeepChain: Record<string, unknown> = (() => {
  let node = leaf('n9', 'author 9', 'depth 9')
  for (let index = 8; index >= 0; index -= 1) {
    node = {
      id: `n${index}`,
      author: `author ${index}`,
      body: `depth ${index}`,
      children: [node],
    }
  }
  return node
})()

/** `@molecule/app-feature-thread-tree-react`. */
export const featureThreadTreeFeature: FeatureCases = {
  package: '@molecule/app-feature-thread-tree-react',
  families: [
    {
      component: 'ThreadTree',
      cases: [
        { name: 'one top-level comment', props: { comments: [leaf('c1', 'alice', 'Top level')] } },
        { name: 'nested replies', props: { comments: thread } },
        {
          name: 'a plain-text body keeps line breaks, unicode and long words',
          props: {
            comments: [
              {
                id: 'c1',
                author: 'Nia',
                body: `Unicode: 你好 🌿\nSecond line with <script>alert(1)</script>\n${'antidisestablishmentarianism'.repeat(6)}`,
              },
            ],
          },
        },
        {
          name: 'a node-valued author and a rich body',
          props: {
            comments: [
              {
                id: 'c1',
                author: { $nodes: [{ tag: 'strong', children: ['Reader'] }] },
                body: {
                  $nodes: [
                    {
                      tag: 'section',
                      children: [
                        { tag: 'h2', children: ['Details'] },
                        { tag: 'p', children: ['A rendered paragraph'] },
                      ],
                    },
                  ],
                },
              },
            ],
          },
        },
        {
          name: 'score, createdAt and an upvoted comment',
          props: {
            comments: [
              {
                id: 'c1',
                author: 'alice',
                body: 'Top level',
                score: 12,
                createdAt: '2026-01-02T03:04:05Z',
                upvoted: true,
              },
              { id: 'c2', author: 'bob', body: 'No score yet', score: 0 },
            ],
          },
        },
        {
          name: 'reply and upvote slots fire with the comment and the next state',
          props: { comments: thread },
          callbacks: ['onReply', 'onUpvote'],
          interactions: [
            { type: 'click', selector: '[data-mol-id="thread-tree-reply-c1-1"]' },
            { type: 'click', selector: '[data-mol-id="thread-tree-upvote-c1"]' },
            { type: 'click', selector: '[data-mol-id="thread-tree-upvote-c1-1"]' },
          ],
        },
        {
          name: 'only the upvote slot',
          props: { comments: thread },
          callbacks: ['onUpvote'],
          interactions: [{ type: 'click', selector: '[data-mol-id="thread-tree-upvote-c1-2"]' }],
        },
        {
          name: 'only the reply slot',
          props: { comments: thread },
          callbacks: ['onReply'],
          interactions: [{ type: 'click', selector: '[data-mol-id="thread-tree-reply-c2"]' }],
        },
        {
          name: 'a sub-tree collapses and expands',
          props: { comments: thread },
          callbacks: ['onCollapse'],
          interactions: [
            { type: 'click', selector: '[data-mol-id="thread-tree-toggle-c1"]' },
            { type: 'click', selector: '[data-mol-id="thread-tree-toggle-c1"]' },
          ],
        },
        {
          name: 'the default depth of four auto-collapses a deeper thread',
          props: { comments: [deepChain] },
        },
        {
          name: 'a depth threshold of one collapses replies with children',
          props: { comments: thread, defaultCollapsedDepth: 1 },
        },
        {
          name: 'a depth threshold of zero collapses top-level threads',
          props: { comments: thread, defaultCollapsedDepth: 0 },
        },
        {
          name: 'fully expanded with an infinite threshold',
          props: { comments: thread, defaultCollapsedDepth: Infinity },
        },
        {
          name: 'classes and an id',
          props: { comments: thread, className: 'parity-token', dataMolId: 'threads' },
        },
        { name: 'an empty tree', props: { comments: [] } },
        {
          name: 'indentation clamps at eight levels',
          props: { comments: [veryDeepChain] },
        },
        {
          name: 'comments change without resetting the collapse state',
          props: { comments: thread },
          interactions: [
            { type: 'click', selector: '[data-mol-id="thread-tree-toggle-c1"]' },
            {
              type: 'props',
              props: { comments: [leaf('c9', 'zoe', 'Replacements only')] },
            },
          ],
        },
        {
          name: 'a depth threshold change keeps the collapse state',
          props: { comments: thread, defaultCollapsedDepth: 1 },
          interactions: [{ type: 'props', props: { defaultCollapsedDepth: 0 } }],
        },
      ],
    },
  ],
}
