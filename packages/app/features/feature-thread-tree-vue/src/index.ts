/**
 * Vue nested comment tree with per-node collapse, auto-collapse below a
 * configurable depth, and a parent-line indicator.
 *
 * Exports the `<ThreadTree>` recursive renderer plus the `Comment` type and
 * `ThreadTreeProps`. Used by link-aggregator, blog comments, podcast,
 * video-streaming, ai-customer-service-bot, and rag-knowledge-base apps. It is
 * the Vue counterpart of `@molecule/app-feature-thread-tree-react`: the same
 * props (React names) and the same DOM for the same input.
 *
 * Plain-string bodies render as complete paragraphs, preserve line breaks, and
 * wrap long words. Strings stay escaped text. Rich bodies keep a block
 * container without an extra paragraph around their own block elements.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { ThreadTree } from '@molecule/app-feature-thread-tree-vue'
 *
 * const Comments = defineComponent({
 *   setup() {
 *     return () =>
 *       h(ThreadTree, {
 *         comments,
 *         onReply: (id: string) => openReplyForm(id),
 *         onUpvote: (id: string) => upvote(id),
 *         defaultCollapsedDepth: 4,
 *       })
 *   },
 * })
 *
 * createApp(Comments).mount('#comments')
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
