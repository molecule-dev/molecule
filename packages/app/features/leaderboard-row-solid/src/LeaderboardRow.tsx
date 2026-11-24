/**
 * Solid leaderboard row: rank + avatar + name + score + optional rank-delta
 * arrow.
 *
 * Solid counterpart of `@molecule/app-leaderboard-row-react`'s
 * `LeaderboardRow` — the same props (React names), the same DOM for the same
 * input.
 *
 * @module
 */

import type { Component } from 'solid-js'

import { PresentWhileNode, ResolveNode } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Avatar } from '@molecule/app-ui-solid'

import type { LeaderboardRowProps } from './types.js'

/** The medal emoji rendered in place of the rank for the top three. */
const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

/**
 * Leaderboard row — rank + avatar + name + score + optional rank-delta
 * arrow. Top 3 ranks render a medal in place of the numeric rank. Ranks 1–3
 * render medal emoji instead of the rank number; there is no prop to disable
 * them. When `name` is not a plain string the Avatar's accessible name falls
 * back to 'Player'. With `onClick` the row is a button in the a11y tree
 * (Enter / Space activate it).
 *
 * @param props - Component props (see {@link LeaderboardRowProps}).
 * @returns The rendered leaderboard row.
 */
export const LeaderboardRow: Component<LeaderboardRowProps> = (props) => {
  const cm = getClassMap()
  const clickable = (): boolean => typeof props.onClick === 'function'
  // When the row is interactive, Enter / Space activate it (React's
  // `handleKeyDown`): preventDefault, then the click handler with no event.
  const handleKeyDown = (event: KeyboardEvent): void => {
    const onClick = props.onClick
    if (!onClick) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick()
    }
  }

  return (
    <ResolveNode node={props.name}>
      {(name) => {
        const displayName = (): string =>
          typeof name() === 'string' ? (name() as string) : 'Player'
        return (
          <div
            class={cm.cn(
              cm.flex({ align: 'center', gap: 'sm' }),
              cm.sp('px', 3),
              cm.sp('py', 2),
              clickable() ? cm.cursorPointer : undefined,
              props.isMe ? cm.bgTone('info', { subtle: true }) : undefined,
              props.className,
            )}
            style={props.isMe ? { 'border-radius': '8px' } : undefined}
            role={clickable() ? 'button' : undefined}
            tabindex={clickable() ? 0 : undefined}
            onClick={props.onClick}
            onKeyDown={handleKeyDown}
          >
            <span
              class={cm.cn(cm.shrink0, cm.fontWeight('bold'), cm.textCenter)}
              style={{ 'min-width': '32px' }}
            >
              {MEDAL[props.rank] ?? `#${props.rank}`}
            </span>
            <Avatar src={props.avatarSrc} alt={displayName()} name={displayName()} size="sm" />
            <div class={cm.cn(cm.flex1, cm.stack(0 as const))}>
              <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{name()}</span>
              {/* React's `slot(subtitle) && …`: an empty list renders nothing. */}
              <PresentWhileNode node={props.subtitle}>
                {(subtitle) => <span class={cm.textSize('xs')}>{subtitle()}</span>}
              </PresentWhileNode>
            </div>
            {/* React's `rankDelta !== undefined && rankDelta !== 0`: a zero delta renders nothing. */}
            {props.rankDelta !== undefined && props.rankDelta !== 0 && (
              <span
                class={cm.cn(
                  cm.textSize('xs'),
                  cm.fontWeight('semibold'),
                  cm.textTone(props.rankDelta > 0 ? 'success' : 'error'),
                )}
              >
                {props.rankDelta > 0 ? '▲' : '▼'} {Math.abs(props.rankDelta)}
              </span>
            )}
            <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>{props.score}</span>
          </div>
        )
      }}
    </ResolveNode>
  )
}
