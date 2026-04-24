import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Avatar } from '@molecule/app-ui-react'

interface LeaderboardRowProps {
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
  /** Click handler. */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

/**
 * Leaderboard row — rank + avatar + name + score + optional rank-delta
 * arrow. Top 3 ranks render a medal in place of the numeric rank.
 * @param root0
 * @param root0.rank
 * @param root0.name
 * @param root0.avatarSrc
 * @param root0.score
 * @param root0.rankDelta
 * @param root0.subtitle
 * @param root0.isMe
 * @param root0.onClick
 * @param root0.className
 */
export function LeaderboardRow({
  rank,
  name,
  avatarSrc,
  score,
  rankDelta,
  subtitle,
  isMe,
  onClick,
  className,
}: LeaderboardRowProps) {
  const cm = getClassMap()
  const dispName = typeof name === 'string' ? name : 'Player'
  return (
    <div
      onClick={onClick}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.sp('px', 3),
        cm.sp('py', 2),
        onClick ? cm.cursorPointer : undefined,
        className,
      )}
      style={isMe ? { background: 'rgba(96,165,250,0.1)', borderRadius: 8 } : undefined}
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
          className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
          style={{ color: rankDelta > 0 ? '#22c55e' : '#ef4444' }}
        >
          {rankDelta > 0 ? '▲' : '▼'} {Math.abs(rankDelta)}
        </span>
      )}
      <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>{score}</span>
    </div>
  )
}
