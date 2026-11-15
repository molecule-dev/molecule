/**
 * Angular leaderboard list container — the counterpart of
 * `@molecule/app-leaderboard-list-react`: the same props and the same DOM for
 * the same input.
 *
 * Exports `<LeaderboardList>` — header row (title + actions) above a vertical
 * stack of rows. Pair with a row component
 * (`@molecule/app-leaderboard-row-react` in React apps; your own Angular
 * rows otherwise) — this container adds no rank/podium logic of its own.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { LeaderboardList } from '@molecule/app-leaderboard-list-angular'
 *
 * @Component({
 *   selector: 'app-top-contributors',
 *   standalone: true,
 *   imports: [LeaderboardList],
 *   template: `
 *     <div mol-leaderboard-list>
 *       <h3 slot="title">Top Contributors</h3>
 *       @for (e of entries; track e.id) {
 *         <div class="flex justify-between">
 *           <span>{{ e.rank }}. {{ e.name }}</span>
 *           <strong>{{ e.score }}</strong>
 *         </div>
 *       }
 *     </div>
 *   `,
 * })
 * export class TopContributors {
 *   entries = [
 *     { id: 'u1', rank: 1, name: 'Alice Chen', score: 4820 },
 *     { id: 'u2', rank: 2, name: 'Bo Diaz', score: 4515 },
 *   ]
 * }
 * ```
 *
 * @remarks
 * - Node props are projected content: `title` is selected by `[slot=title]`,
 *   `actions` by `[slot=actions]`, `emptyState` by `[slot=emptyState]`, and
 *   the rows are the element's default content.
 * - `emptyState` renders only when the default content is empty; map your
 *   entries directly (as in the example) so the empty case is detectable.
 * - No `data-mol-id` prop; styling resolves through `getClassMap()`.
 *
 * @module
 */

export * from './leaderboard-list.component.js'
export * from './types.js'
