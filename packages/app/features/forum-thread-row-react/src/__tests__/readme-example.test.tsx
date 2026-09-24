/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ForumThreadRow } from '../index.js'

const threads = [
  {
    id: 't1',
    title: 'Forum rules — read first',
    votes: 120,
    replies: 0,
    views: 5400,
    author: 'mod',
    createdAt: 'Jan 2',
    pinned: true,
    locked: true,
  },
  {
    id: 't2',
    title: 'How do I reset my password?',
    excerpt: 'The reset email never arrives.',
    votes: 42,
    replies: 7,
    views: 320,
    author: 'alice',
    createdAt: '2 hours ago',
  },
]

/**
 * The README example, verbatim.
 *
 * @returns The rendered forum index.
 */
function ForumIndex(): React.JSX.Element {
  return (
    <section>
      {threads.map((thread) => (
        <ForumThreadRow
          key={thread.id}
          title={<a href={`/forum/${thread.id}`}>{thread.title}</a>}
          excerpt={thread.excerpt}
          voteScore={thread.votes}
          replyCount={thread.replies}
          viewCount={thread.views}
          author={thread.author}
          createdAt={thread.createdAt}
          pinned={thread.pinned}
          locked={thread.locked}
        />
      ))}
    </section>
  )
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })

  it('renders one linked row per thread with counts and pin/lock badges', () => {
    const html = renderToStaticMarkup(<ForumIndex />)
    expect(html.match(/<article/g)).toHaveLength(2)
    expect(html).toContain('<a href="/forum/t1">Forum rules — read first</a>')
    expect(html).toContain('<a href="/forum/t2">How do I reset my password?</a>')
    expect(html).toContain('The reset email never arrives.')
    expect(html).toContain('>120</span>')
    expect(html.match(/>votes</g)).toHaveLength(2)
    expect(html).toContain('>· 7 replies<')
    expect(html).toContain('>· 320 views<')
    expect(html).toContain('>· 2 hours ago<')
    expect(html).toContain('>· 0 replies<')
    expect(html.match(/aria-label="Pinned"/g)).toHaveLength(1)
    expect(html.match(/aria-label="Locked"/g)).toHaveLength(1)
  })
})
