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
 * back to 'Player'. `onClick` gives the row a pointer cursor but no keyboard
 * or role semantics.
 *
 * @param props - Component props (see {@link LeaderboardRowProps}).
 * @returns The rendered leaderboard row.
 */
export const LeaderboardRow: Component<LeaderboardRowProps> = (props) => {
  const cm = getClassMap()
  const displayName = (): string => (typeof props.name === 'string' ? props.name : 'Player')
  return (
    <div
      class={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.sp('px', 3),
        cm.sp('py', 2),
        props.onClick ? cm.cursorPointer : undefined,
        props.className,
      )}
      style={
        props.isMe ? { background: 'rgba(96,165,250,0.1)', 'border-radius': '8px' } : undefined
      }
      onClick={props.onClick}
    >
      <span
        class={cm.cn(cm.shrink0, cm.fontWeight('bold'), cm.textCenter)}
        style={{ 'min-width': '32px' }}
      >
        {MEDAL[props.rank] ?? `#${props.rank}`}
      </span>
      <Avatar src={props.avatarSrc} alt={displayName()} name={displayName()} size="sm" />
      <div class={cm.cn(cm.flex1, cm.stack(0 as const))}>
        <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{props.name}</span>
        {/* React's `{subtitle && …}`: a falsy subtitle renders nothing. */}
        {props.subtitle && <span class={cm.textSize('xs')}>{props.subtitle}</span>}
      </div>
      {/* React's `rankDelta !== undefined && rankDelta !== 0`: a zero delta renders nothing. */}
      {props.rankDelta !== undefined && props.rankDelta !== 0 && (
        <span
          class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
          style={{ color: props.rankDelta > 0 ? '#22c55e' : '#ef4444' }}
        >
          {props.rankDelta > 0 ? '▲' : '▼'} {Math.abs(props.rankDelta)}
        </span>
      )}
      <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>{props.score}</span>
    </div>
  )
}
