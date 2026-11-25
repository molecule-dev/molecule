import type { JSX } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Box, Pressable, Text } from '@molecule/app-ui-react/elements'

/** A single emoji reaction with its count and current-user state. */
export interface MessageReaction {
  /** Emoji or symbol. */
  emoji: string
  /** Reaction count. */
  count: number
  /** Whether the current user reacted. */
  reactedByMe?: boolean
}

/** Props for {@link MessageReactions}. */
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
    <Box
      as="div"
      className={cm.cn(cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }), className)}
    >
      {reactions.map((r) => (
        <Pressable
          as="button"
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
          <Text as="span">{r.emoji}</Text>
          <Text as="span">{r.count}</Text>
        </Pressable>
      ))}
      {onAdd && (
        <Pressable
          as="button"
          type="button"
          onClick={onAdd}
          className={cm.cn(cm.sp('px', 2), cm.sp('py', 1), cm.textSize('xs'))}
        >
          +
        </Pressable>
      )}
    </Box>
  )
}
