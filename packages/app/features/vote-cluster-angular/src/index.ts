/**
 * Angular Reddit/HN-style vote cluster — stacked up/down arrows + score readout.
 *
 * Exports `<VoteCluster>` — the Angular counterpart of
 * `@molecule/app-vote-cluster-react`: the same props (React names) and the same
 * DOM for the same input. Toggle semantics handle upvote, downvote, and "click
 * again to clear" optimistic flows. All UI text flows through `t()` with
 * translations supplied by the companion `@molecule/app-locales-vote-cluster`
 * package.
 *
 * @example
 * ```ts
 * import { Component, signal } from '@angular/core'
 * import { VoteCluster, type VoteValue } from '@molecule/app-vote-cluster-angular'
 *
 * @Component({
 *   selector: 'app-post-row',
 *   standalone: true,
 *   imports: [VoteCluster],
 *   template: `
 *     <div
 *       mol-vote-cluster
 *       [score]="score()"
 *       [myVote]="myVote()"
 *       (onVote)="vote($event)"
 *     ></div>
 *   `,
 * })
 * export class PostRow {
 *   readonly score = signal(0)
 *   readonly myVote = signal<VoteValue>(0)
 *   vote(next: VoteValue): void {
 *     this.score.update((score) => score - this.myVote() + next)
 *     this.myVote.set(next)
 *     void fetch('/api/posts/1/vote', {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify({ vote: next }),
 *     })
 *   }
 * }
 * ```
 *
 * @remarks
 * - The host IS the outer `<div>` (`div[mol-vote-cluster]`), matching React's
 *   root element; `(onVote)` is a plain output-style callback input.
 * - Requires a bonded ClassMap; the active arrow is painted through
 *   `--mol-color-*` custom properties, and the view needs
 *   `@molecule/app-angular`'s i18n provider above it.
 * - Uncontrolled by default (tracks the vote internally); pass `myVote` +
 *   `onVote` for controlled mode.
 *
 * @module
 */

export * from './types.js'
export * from './vote-cluster.component.js'
