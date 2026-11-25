/**
 * The action a route change listener receives for a React Navigation state change, which the
 * `Router` contract of `@molecule/app-routing` defines as how the change moved the history.
 * React Navigation's `state` event does not say, so it is read from the navigation state
 * before and after the change. Not re-exported by the index.
 *
 * @module
 */

// The contract's action is the one a route change listener receives; this package's own
// `NavigationAction` (types.ts) is the object `navigationRef.dispatch` takes.
import type { NavigationAction as RouteChangeAction } from '@molecule/app-routing'

import type { NavigationState, PartialNavigationState } from './types.js'

/** A navigator's state, full or the part React Navigation keeps for one it is not rendering. */
type AnyNavigationState = NavigationState | PartialNavigationState

/**
 * One navigator on the way to the focused route: the keys of the routes it keeps, in stack
 * order, and which of them is focused.
 */
export interface NavigatorStack {
  keys: Array<string | undefined>
  focusedIndex: number
}

/**
 * What is kept of a navigation state to classify the change that follows it.
 */
export interface NavigationSnapshot {
  /** The key of the focused route, the deepest one. */
  focusedKey: string | undefined
  /** The navigators on the way to the focused route, outermost first. */
  stacks: NavigatorStack[]
  /** Every route key in the state, in those navigators and in the others alike. */
  routeKeys: Set<string>
}

/**
 * The index of the focused route. A partial state may lack it; React Navigation then reads
 * the last route as the focused one.
 */
const focusedIndex = (state: AnyNavigationState): number => state.index ?? state.routes.length - 1

/**
 * Collects every route key in a navigator's state, nested navigators included.
 */
function collectRouteKeys(state: AnyNavigationState, into: Set<string>): void {
  for (const route of state.routes) {
    if (route.key !== undefined) into.add(route.key)
    if (route.state) collectRouteKeys(route.state, into)
  }
}

/**
 * The navigators on the way to the focused route, outermost first: one navigator's stack,
 * then the nested navigator of the route it focuses on, as `getCurrentRoute` follows them.
 */
function focusedStacks(state: AnyNavigationState): NavigatorStack[] {
  const index = focusedIndex(state)
  const stack: NavigatorStack = {
    keys: state.routes.map((route) => route.key),
    focusedIndex: index,
  }
  const nested = state.routes[index]?.state
  return nested ? [stack, ...focusedStacks(nested)] : [stack]
}

/**
 * Reads what classifies the next change from a navigation state.
 *
 * @param state - The root navigator's state, or `undefined` while the container has none.
 * @param focusedKey - The key of the focused route, from `getCurrentRoute()`.
 * @returns The snapshot, or `undefined` when there is no state to read.
 */
export function readNavigationSnapshot(
  state: NavigationState | undefined,
  focusedKey: string | undefined,
): NavigationSnapshot | undefined {
  if (!state) return undefined
  const routeKeys = new Set<string>()
  collectRouteKeys(state, routeKeys)
  return { focusedKey, stacks: focusedStacks(state), routeKeys }
}

/** Whether a navigator kept the same routes and the same focused one. */
function sameStack(before: NavigatorStack, after: NavigatorStack): boolean {
  return (
    before.focusedIndex === after.focusedIndex &&
    before.keys.length === after.keys.length &&
    before.keys.every((key, i) => key === after.keys[i])
  )
}

/**
 * The depth, from the root down, of the first navigator whose stack or focused route
 * differs. It is `undefined` when the two chains of navigators are the same, and one past
 * the end of the shorter chain when one chain continues where the other stops: a navigator
 * that appeared, or went away.
 */
function firstChangedStackLevel(
  previous: NavigatorStack[],
  next: NavigatorStack[],
): number | undefined {
  const depth = Math.min(previous.length, next.length)
  for (let level = 0; level < depth; level++) {
    if (!sameStack(previous[level], next[level])) return level
  }
  return previous.length === next.length ? undefined : depth
}

/**
 * Whether a route the state did not have took the focused route's place: the stack kept
 * its length and every other route.
 *
 * @remarks
 * Called after the rule for a move to an existing route, so the new route is known to sit
 * where the focused one was: had focus moved to another position of the stack, that
 * position would hold a route the stack already kept, which is a move. This is not checked
 * again here.
 */
function replacedFocusedRoute(before: NavigatorStack, after: NavigatorStack): boolean {
  if (before.keys.length !== after.keys.length) return false
  const focused = before.focusedIndex
  return (
    before.keys[focused] !== after.keys[focused] &&
    before.keys.every((key, i) => i === focused || key === after.keys[i])
  )
}

/**
 * The action a route change listener receives for the change from one navigation state to
 * the next.
 *
 * @remarks
 * - The newly focused route is one the previous state already kept, somewhere else than
 *   where it was focused: `pop`, a move to an existing entry. That is a back or a forward
 *   move, from `router.back()` or from the device, inside a nested navigator or out of one;
 *   a tab the navigator already keeps is such an entry too.
 * - A route the state did not have is a `replace` when it took the focused route's place in
 *   a stack that kept its length, and a `push` otherwise, on top of a stack or as a navigator
 *   that appeared.
 * - A change is reported as `push` when it keeps the focused route, as every change was
 *   before the action was read from the state (params were set, or a navigator that is not
 *   on the way to the focused route changed); when the navigators under the focused route
 *   lose their state without it moving (a nested navigator unmounted: the screen is the
 *   same, described less deeply); and when there is no focused route to classify by. Which
 *   changes notify is not this function's to change.
 *
 * @param previous - The state before the change, or `undefined` when none could be read.
 * @param next - The state after it, or `undefined` when none can be read.
 * @returns The action.
 */
export function classifyRouteChange(
  previous: NavigationSnapshot | undefined,
  next: NavigationSnapshot | undefined,
): RouteChangeAction {
  // A state missing on either side leaves nothing to compare: the navigator's first state,
  // or one it dropped since the last change.
  if (!previous || !next) return 'push'
  // The focused route is unchanged. Kept as `push`: deciding which of these changes should
  // notify at all is outside the change that derives the action from the state.
  if (previous.focusedKey === next.focusedKey) return 'push'
  // No focused route to classify by.
  if (next.focusedKey === undefined) return 'push'

  const level = firstChangedStackLevel(previous.stacks, next.stacks)
  // The new navigators are the previous ones without the last: a nested navigator's state
  // went away while the route above it stays focused. Not a move to another entry, so `push`
  // as before, even though that route is one the state already kept.
  if (level !== undefined && level === next.stacks.length) return 'push'
  // The focused route existed before, somewhere else than where focus was: a move to it.
  if (previous.routeKeys.has(next.focusedKey)) return 'pop'

  // A route the state did not have: a replacement where it took the focused route's place.
  const before = level === undefined ? undefined : previous.stacks[level]
  const after = level === undefined ? undefined : next.stacks[level]
  if (before && after && replacedFocusedRoute(before, after)) return 'replace'
  return 'push'
}
