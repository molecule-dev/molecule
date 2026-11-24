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

import { ResolveNode, resolveNode } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { LeaderboardListProps } from './types.js'

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
  // React's `children` array: Solid's `children` helper resolves whatever the caller passed
  // (elements, text, a `<For>`, a conditional) to the flat list of rendered children, and
  // follows it when it changes, so the count and the list stay one value.
  const resolved = resolveNode(() => props.children)
  const childCount = (): number => resolved.toArray().length
  return (
    <div class={cm.cn(cm.stack(2), props.className)}>
      <ResolveNode node={props.title}>
        {(title, hasTitle) => (
          // React reads `actions` as a plain node (`actions &&`), so an empty list still opens the
          // header; `actions()` keeps that truthiness. Read inside JSX, so the header follows both.
          <ResolveNode node={props.actions}>
            {(actions) => (
              <>
                {(hasTitle() || actions()) && (
                  <header class={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
                    {hasTitle() && (
                      <h3 class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{title()}</h3>
                    )}
                    {actions()}
                  </header>
                )}
              </>
            )}
          </ResolveNode>
        )}
      </ResolveNode>
      {childCount() === 0 ? props.emptyState : <div class={cm.stack(1 as const)}>{resolved()}</div>}
    </div>
  )
}
