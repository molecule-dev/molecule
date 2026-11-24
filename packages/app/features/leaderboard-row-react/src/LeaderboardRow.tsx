import type { KeyboardEvent, ReactElement, ReactNode } from 'react'

import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Avatar } from '@molecule/app-ui-react'

/** Props for {@link LeaderboardRow}. */
export interface LeaderboardRowProps {
  /** 1-based rank. */
  rank: number
  /** Display name. */
  name: ReactNode
  /** Optional avatar URL. */
  avatarSrc?: string
  /** Score / metric. */
  score: ReactNode
  /** Optional change indicator (positive = climbed). */
  rankDelta?: number
  /** Optional secondary line (team, level, country). */
  subtitle?: ReactNode
  /** Whether this row represents the current user (highlighted). */
  isMe?: boolean
  /** Click handler. Also runs, with no event, on Enter / Space while set. */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

/**
 * Leaderboard row — rank + avatar + name + score + optional rank-delta
 * arrow. Top 3 ranks render a medal in place of the numeric rank. With
 * `onClick` the row is a button in the a11y tree (Enter / Space activate it).
 * @param props - Component props (see {@link LeaderboardRowProps}).
 */
export function LeaderboardRow({
  rank,
  name,
  avatarSrc,
  score,
  rankDelta,
  subtitle: subtitleProp,
  isMe,
  onClick,
  className,
}: LeaderboardRowProps): ReactElement {
  const subtitle = slot(subtitleProp)
  const cm = getClassMap()
  const dispName = typeof name === 'string' ? name : 'Player'
  // When the row is interactive, promote the <div> to a real button in the
  // a11y tree: role/tabIndex make it focusable and Enter/Space activate it,
  // matching native button keyboard semantics.
  const handleKeyDown = onClick
    ? (event: KeyboardEvent<HTMLDivElement>): void => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      }
    : undefined
  return (
    <div
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.sp('px', 3),
        cm.sp('py', 2),
        onClick ? cm.cursorPointer : undefined,
        isMe ? cm.bgTone('info', { subtle: true }) : undefined,
        className,
      )}
      style={isMe ? { borderRadius: 8 } : undefined}
    >
      <span
        className={cm.cn(cm.shrink0, cm.fontWeight('bold'), cm.textCenter)}
        style={{ minWidth: 32 }}
      >
        {MEDAL[rank] ?? `#${rank}`}
      </span>
      <Avatar src={avatarSrc} alt={dispName} name={dispName} size="sm" />
      <div className={cm.cn(cm.flex1, cm.stack(0 as const))}>
        <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{name}</span>
        {subtitle && <span className={cm.textSize('xs')}>{subtitle}</span>}
      </div>
      {rankDelta !== undefined && rankDelta !== 0 && (
        <span
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('semibold'),
            cm.textTone(rankDelta > 0 ? 'success' : 'error'),
          )}
        >
          {rankDelta > 0 ? '▲' : '▼'} {Math.abs(rankDelta)}
        </span>
      )}
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>{score}</span>
    </div>
  )
}
