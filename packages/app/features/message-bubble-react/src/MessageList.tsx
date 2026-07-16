import type { JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

import { MessageBubble } from './MessageBubble.js'
import type { MessageData } from './types.js'

export interface MessageListProps {
  messages: MessageData[]
  /** When provided, viewer-authored messages flip alignment to the right. */
  selfAuthorId?: string
  /** Optional date separator renderer (receives the current message). */
  renderDateSeparator?: (message: MessageData, i: number) => ReactNode
  /** Empty-state node when `messages` is empty. */
  emptyState?: ReactNode
  /** Extra classes. */
  className?: string
}

/**
 * Vertical list of `<MessageBubble>`s with optional date separators.
 * @param props - Component props (see {@link MessageListProps}).
 */
export function MessageList({
  messages,
  selfAuthorId,
  renderDateSeparator,
  emptyState,
  className,
}: MessageListProps): JSX.Element {
  const cm = getClassMap()
  if (messages.length === 0 && emptyState) return <>{emptyState}</>
  return (
    <div className={cm.cn(cm.stack(3), className)}>
      {messages.map((m, i) => (
        <div key={m.id} className={cm.stack(2)}>
          {renderDateSeparator?.(m, i)}
          <MessageBubble message={m} isSelf={m.author.id === selfAuthorId} />
        </div>
      ))}
    </div>
  )
}
