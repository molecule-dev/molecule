/**
 * Solid leaderboard list container: header row (title + actions) above a
 * stack of rows.
 *
 * Solid counterpart of `@molecule/app-leaderboard-list-react`'s
 * `LeaderboardList` — the same props (React names), the same DOM for the same
 * input.
 *
 * @module
 */

import type { Component } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { LeaderboardListProps } from './types.js'

/**
 * Whether a node-valued prop carries anything to render — React's
 * truthiness for a node, an array's length for a list.
 *
 * @param value - The prop value.
 * @returns True when it renders.
 */
const renders = (value: unknown): boolean => (Array.isArray(value) ? value.length > 0 : !!value)

/**
 * Container above a stack of rows — header + actions + the list. Doesn't
 * itself render rank logic; pair with `<LeaderboardRow>` from
 * `@molecule/app-leaderboard-row-react` (or your own rows).
 *
 * The `emptyState` renders only when `children` is empty or absent; map your
 * entries directly (as in the example) so the empty case is detectable.
 *
 * @param props - Component props (see {@link LeaderboardListProps}).
 * @returns The rendered leaderboard list.
 */
export const LeaderboardList: Component<LeaderboardListProps> = (props) => {
  const cm = getClassMap()
  const childCount = (): number => {
    const children = props.children
    return Array.isArray(children) ? children.length : children ? 1 : 0
  }
  return (
    <div class={cm.cn(cm.stack(2), props.className)}>
      {(renders(props.title) || renders(props.actions)) && (
        <header class={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
          {renders(props.title) && (
            <h3 class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{props.title}</h3>
          )}
          {props.actions}
        </header>
      )}
      {childCount() === 0 ? (
        props.emptyState
      ) : (
        <div class={cm.stack(1 as const)}>{props.children}</div>
      )}
    </div>
  )
}
