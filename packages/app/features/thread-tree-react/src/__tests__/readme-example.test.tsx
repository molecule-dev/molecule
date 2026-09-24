// @vitest-environment jsdom
/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written.
 *
 * @module
 */
import { cleanup, fireEvent, render, within } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { type Comment, ThreadTree } from '../index.js'

const initialComments: Comment[] = [
  {
    id: 'c1',
    author: 'ada',
    body: 'Great write-up!',
    createdAt: '2 hours ago',
    score: 12,
    children: [
      {
        id: 'c2',
        author: 'grace',
        body: 'Agreed, the diagrams help.',
        createdAt: '1 hour ago',
        score: 3,
      },
    ],
  },
  {
    id: 'c3',
    author: 'linus',
    body: 'What about Windows support?',
    createdAt: '30 minutes ago',
    score: 1,
  },
]

/**
 * Sets a comment's upvote state anywhere in the tree.
 *
 * @param nodes - Comment tree.
 * @param id - Comment id.
 * @param next - New upvote state.
 * @returns The updated tree.
 */
function setUpvote(nodes: Comment[], id: string, next: boolean): Comment[] {
  return nodes.map((c) =>
    c.id === id
      ? { ...c, upvoted: next, score: (c.score ?? 0) + (next ? 1 : -1) }
      : { ...c, children: c.children && setUpvote(c.children, id, next) },
  )
}

/**
 * The README example, verbatim.
 *
 * @returns The rendered comments section.
 */
function CommentsSection(): React.JSX.Element {
  const [comments, setComments] = useState(initialComments)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  return (
    <section>
      <ThreadTree
        comments={comments}
        onUpvote={(id, next) => setComments((prev) => setUpvote(prev, id, next))}
        onReply={setReplyingTo}
      />
      {replyingTo && <p>Replying to {replyingTo}</p>}
    </section>
  )
}

/**
 * Returns the rendered node for a comment id.
 *
 * @param container - Render container.
 * @param id - Comment id.
 * @returns The comment's `<li>`.
 */
function node(container: HTMLElement, id: string): HTMLElement {
  const el = container.querySelector<HTMLElement>(`[data-mol-id="thread-tree-comment-${id}"]`)
  if (!el) throw new Error(`comment ${id} not rendered`)
  return el
}

describe('README @example', () => {
  beforeAll(() => {
    setClassMap(classMap)
  })
  afterEach(() => {
    cleanup()
  })

  it('renders the nested tree, applies upvotes via parent state, and reports replies', () => {
    const view = render(
      <I18nProvider provider={createSimpleI18nProvider('en')}>
        <CommentsSection />
      </I18nProvider>,
    )
    const { container } = view
    expect(node(container, 'c2').getAttribute('data-thread-depth')).toBe('1')
    expect(node(container, 'c1').contains(node(container, 'c2'))).toBe(true)
    expect(view.getByText('Agreed, the diagrams help.')).toBeTruthy()
    expect(view.getByText('2 hours ago').tagName).toBe('TIME')

    const grace = node(container, 'c2')
    fireEvent.click(within(grace).getByRole('button', { name: 'Upvote' }))
    expect(within(node(container, 'c2')).getByText('4 points')).toBeTruthy()
    expect(
      within(node(container, 'c2'))
        .getByRole('button', { name: 'Upvote' })
        .getAttribute('aria-pressed'),
    ).toBe('true')

    fireEvent.click(within(node(container, 'c3')).getByRole('button', { name: 'Reply' }))
    expect(view.getByText('Replying to c3')).toBeTruthy()

    fireEvent.click(
      within(node(container, 'c1')).getAllByRole('button', {
        name: 'Collapse thread',
      })[0] as HTMLElement,
    )
    expect(view.getByText('1 hidden')).toBeTruthy()
    expect(view.queryByText('Agreed, the diagrams help.')).toBeNull()
  })
})
