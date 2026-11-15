/**
 * Vue forum / discussion-board thread row.
 *
 * Exports `ForumThreadRow` — title, optional excerpt, vote score, reply/view
 * counts, pin/lock badges, author, timestamp, and an optional `voteControls`
 * slot for inline up/down buttons. It is the Vue counterpart of
 * `@molecule/app-forum-thread-row-react`: the same props (React names) and the
 * same DOM for the same input.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { ForumThreadRow } from '@molecule/app-forum-thread-row-vue'
 *
 * const App = defineComponent({
 *   setup() {
 *     const thread = { id: 't1', title: 'How do I reset my password?' }
 *     const openThread = (): void => {
 *       // navigate to the thread…
 *     }
 *     return () =>
 *       h(ForumThreadRow, {
 *         title: thread.title,
 *         excerpt: 'I tried the forgot-password link but never received an email.',
 *         voteScore: 42,
 *         replyCount: 7,
 *         viewCount: 320,
 *         author: 'alice',
 *         createdAt: '2 hours ago',
 *         onClick: openThread,
 *       })
 *   },
 * })
 *
 * createApp(App).mount('#app')
 * ```
 *
 * @remarks
 * - Styling routes through `getClassMap()` — a ClassMap bond (e.g.
 *   `@molecule/app-ui-tailwind`) must be wired or rendering throws.
 * - KNOWN GAP (same as React): the counter labels ("votes", "replies",
 *   "views") and the pin/lock aria-labels are hardcoded English (there is no
 *   companion locale bond yet). For localized apps, pass pre-formatted content
 *   via `tags` / `voteControls` or wrap the row until the package routes text
 *   through `t()`.
 * - The row has no `data-mol-id` support yet; add your own wrapper attribute
 *   if AI-agent/e2e selectors need to target it.
 * - Node-valued props (`title`, `excerpt`, `author`, `createdAt`, `tags`,
 *   `voteControls`) arrive as a prop AND a same-named slot; components accept
 *   either.
 *
 * @module
 */

export * from './ForumThreadRow.js'
export * from './types.js'
