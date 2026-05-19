/**
 * Nested comment tree with collapse / collapse-deep / parent-line indicator.
 *
 * Exports the `<ThreadTree>` recursive renderer plus the `Comment` type
 * and `defaultCollapsedDepth` prop. Used by link-aggregator, blog comments,
 * podcast, video-streaming, ai-customer-service-bot, and rag-knowledge-base
 * apps.
 *
 * @example
 * ```tsx
 * import { ThreadTree } from '@molecule/app-feature-thread-tree-react'
 *
 * <ThreadTree
 *   comments={comments}
 *   onReply={(id) => openReplyForm(id)}
 *   onUpvote={(id) => upvote(id)}
 *   defaultCollapsedDepth={4}
 * />
 * ```
 *
 * @remarks
 * All UI text resolves through `t()` — install
 * `@molecule/app-locales-feature-thread-tree` for non-English
 * locales. All styling resolves through `getClassMap()` — no Tailwind
 * utilities live in this package.
 *
 * @module
 */

export * from './ThreadTree.js'
export * from './types.js'
