/**
 * Angular nested comment tree with per-node collapse, auto-collapse below a
 * configurable depth, and a parent-line indicator.
 *
 * Exports `<ThreadTree>` — the recursive renderer — plus the `Comment` type and
 * `ThreadTreeProps`. Used by link-aggregator, blog comments, podcast,
 * video-streaming, ai-customer-service-bot, and rag-knowledge-base apps. It is
 * the Angular counterpart of `@molecule/app-feature-thread-tree-react`: the
 * same props (React names) and the same DOM for the same input.
 *
 * Plain-string bodies render as complete paragraphs, preserve line breaks, and
 * wrap long words. Strings stay escaped text. Rich bodies keep a block
 * container without an extra paragraph around their own block elements.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { ThreadTree, type Comment } from '@molecule/app-feature-thread-tree-angular'
 *
 * @Component({
 *   selector: 'app-comments',
 *   standalone: true,
 *   imports: [ThreadTree],
 *   template: `
 *     <ul
 *       mol-thread-tree
 *       [comments]="comments"
 *       [onReply]="openReplyForm"
 *       [onUpvote]="upvote"
 *       [defaultCollapsedDepth]="4"
 *     ></ul>
 *   `,
 * })
 * export class Comments {
 *   readonly comments: Comment[] = [
 *     { id: 'c1', author: 'Alice', body: 'First!', score: 3 },
 *   ]
 *
 *   readonly openReplyForm = (commentId: string): void => {
 *     console.log('reply to', commentId)
 *   }
 *
 *   readonly upvote = (commentId: string, next: boolean): void => {
 *     console.log('upvote', commentId, next)
 *   }
 * }
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

export * from './thread-tree.component.js'
export * from './types.js'
