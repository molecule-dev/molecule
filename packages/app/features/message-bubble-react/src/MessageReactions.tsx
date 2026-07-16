import type { JSX } from 'react'

import { getClassMap } from '@molecule/app-ui'

/** A single emoji reaction with its count and current-user state. */
export interface MessageReaction {
  /** Emoji or symbol. */
  emoji: string
  /** Reaction count. */
  count: number
  /** Whether the current user reacted. */
  reactedByMe?: boolean
}

export interface MessageReactionsProps {
  reactions: MessageReaction[]
  /** Called when a reaction chip is toggled. */
  onToggle?: (emoji: string) => void
  /** Called when the "+" button is clicked. */
  onAdd?: () => void
  /** Extra classes. */
  className?: string
}

/**
 * Row of reaction chips below a message body. Each chip shows emoji +
 * count; when the current user reacted the chip is marked with
 * `aria-pressed` only — no visual highlight ships.
 * @param props - Component props (see {@link MessageReactionsProps}).
 */
export function MessageReactions({
  reactions,
  onToggle,
  onAdd,
  className,
}: MessageReactionsProps): JSX.Element {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }), className)}>
      {reactions.map((r) => (
        <button
          key={r.emoji}
          type="button"
          onClick={() => onToggle?.(r.emoji)}
          aria-pressed={r.reactedByMe}
          className={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 2),
            cm.sp('py', 1),
            cm.textSize('xs'),
            cm.roundedFull,
          )}
        >
          <span>{r.emoji}</span>
          <span>{r.count}</span>
        </button>
      ))}
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className={cm.cn(cm.sp('px', 2), cm.sp('py', 1), cm.textSize('xs'))}
        >
          +
        </button>
      )}
    </div>
  )
}
