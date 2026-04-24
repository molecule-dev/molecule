import { getClassMap } from '@molecule/app-ui'

/**
 *
 */
export interface MessageReaction {
  /** Emoji or symbol. */
  emoji: string
  /** Reaction count. */
  count: number
  /** Whether the current user reacted. */
  reactedByMe?: boolean
}

interface MessageReactionsProps {
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
 * count and highlights when the current user reacted.
 * @param root0
 * @param root0.reactions
 * @param root0.onToggle
 * @param root0.onAdd
 * @param root0.className
 */
export function MessageReactions({ reactions, onToggle, onAdd, className }: MessageReactionsProps) {
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
