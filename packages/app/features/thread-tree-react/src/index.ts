/**
 * Nested comment tree with per-node collapse, auto-collapse below a configurable depth, and a parent-line indicator.
 *
 * Exports the `<ThreadTree>` recursive renderer plus the `Comment` type
 * and `defaultCollapsedDepth` prop. Used by link-aggregator, blog comments,
 * podcast, video-streaming, ai-customer-service-bot, and rag-knowledge-base
 * apps.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { type Comment, ThreadTree } from '@molecule/app-feature-thread-tree-react'
 *
 * const initialComments: Comment[] = [
 *   {
 *     id: 'c1',
 *     author: 'ada',
 *     body: 'Great write-up!',
 *     createdAt: '2 hours ago',
 *     score: 12,
 *     children: [{ id: 'c2', author: 'grace', body: 'Agreed, the diagrams help.', createdAt: '1 hour ago', score: 3 }],
 *   },
 *   { id: 'c3', author: 'linus', body: 'What about Windows support?', createdAt: '30 minutes ago', score: 1 },
 * ]
 *
 * function setUpvote(nodes: Comment[], id: string, next: boolean): Comment[] {
 *   return nodes.map((c) =>
 *     c.id === id
 *       ? { ...c, upvoted: next, score: (c.score ?? 0) + (next ? 1 : -1) }
 *       : { ...c, children: c.children && setUpvote(c.children, id, next) },
 *   )
 * }
 *
 * export function CommentsSection() {
 *   const [comments, setComments] = useState(initialComments)
 *   const [replyingTo, setReplyingTo] = useState<string | null>(null)
 *   return (
 *     <section>
 *       <ThreadTree
 *         comments={comments}
 *         onUpvote={(id, next) => setComments((prev) => setUpvote(prev, id, next))}
 *         onReply={setReplyingTo}
 *       />
 *       {replyingTo && <p>Replying to {replyingTo}</p>}
 *     </section>
 *   )
 * }
 * ```
 *
 * @remarks
 * - The package name is `@molecule/app-feature-thread-tree-react` (note
 *   the `feature-` segment); the node type is `Comment` with nested
 *   `children` — NOT a flat list with `parentId`. Build the tree first.
 * - It does NOT store votes or replies: `onUpvote(id, next)` only reports
 *   the click — update that comment's `upvoted`/`score` in your own state
 *   (as the example does) or nothing changes. The Upvote/Reply buttons
 *   only render when `onUpvote`/`onReply` are passed; there is no reply
 *   form — open your own from `onReply(id)`.
 * - `createdAt` is rendered VERBATIM — pass a formatted string ("2 hours
 *   ago"), not an ISO timestamp.
 * - Collapse state is internal and seeded ONCE on mount from
 *   `defaultCollapsedDepth` (default `4`, 0-indexed); comments added later
 *   are not auto-collapsed.
 * - Must render inside `<I18nProvider>` / `<MoleculeProvider>`
 *   (`useTranslation()` throws otherwise) with a ClassMap bond wired
 *   (`setClassMap(classMap)` from `@molecule/app-ui`). UI text uses
 *   `threadTree.*` keys — install `@molecule/app-locales-feature-thread-tree`
 *   for non-English locales.
 *
 * @module
 */

export * from './ThreadTree.js'
export * from './types.js'
