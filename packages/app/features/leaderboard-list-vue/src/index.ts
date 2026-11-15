/**
 * Vue leaderboard list container.
 *
 * Exports `<LeaderboardList>` — header row (title + actions) above a vertical
 * stack of rows. Props: default slot (pre-rendered rows), `title?`,
 * `actions?` (period selector, filters), `emptyState?`, `className?`. Pair
 * with a row component (`@molecule/app-leaderboard-row-react` in React apps;
 * your own Vue rows otherwise) — this container adds no rank/podium logic of
 * its own. It is the Vue counterpart of `@molecule/app-leaderboard-list-react`:
 * same props and the same DOM for the same input.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h } from 'vue'
 * import { LeaderboardList } from '@molecule/app-leaderboard-list-vue'
 *
 * const entries = [
 *   { id: 'u1', rank: 1, name: 'Alice Chen', score: 4820 },
 *   { id: 'u2', rank: 2, name: 'Bo Diaz', score: 4515 },
 * ]
 *
 * const App = defineComponent({
 *   setup() {
 *     return () =>
 *       h(LeaderboardList, { title: 'Top Contributors' }, {
 *         default: () =>
 *           entries.map((e) =>
 *             h('div', { key: e.id }, [h('span', `${e.rank}. ${e.name}`), h('strong', String(e.score))]),
 *           ),
 *       })
 *   },
 * })
 *
 * createApp(App).mount('#app')
 * ```
 *
 * @remarks
 * - `emptyState` renders only when the default slot is empty; if you pass a
 *   fragment or a single element the list always renders. Map your entries
 *   directly (as in the example) so the empty case is detectable.
 * - No `data-mol-id` prop; styling resolves through `getClassMap()`.
 * - Node-valued props (`title`, `actions`, `emptyState`) arrive as a prop AND
 *   a same-named slot; components accept either.
 *
 * @module
 */

export * from './LeaderboardList.js'
export * from './types.js'
