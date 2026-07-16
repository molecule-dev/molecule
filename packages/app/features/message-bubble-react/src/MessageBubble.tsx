import type { JSX } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Avatar } from '@molecule/app-ui-react'

import { MessageMeta } from './MessageMeta.js'
import type { MessageData } from './types.js'

export interface MessageBubbleProps {
  message: MessageData
  /** Whether the current viewer is the message author (affects alignment + accent). */
  isSelf?: boolean
  /** Render the author row (avatar + name + time). Defaults to true. */
  showMeta?: boolean
  /** Extra classes. */
  className?: string
}

/**
 * One message in a chat thread — avatar, author/timestamp row, body,
 * plus optional attachments/reactions/thread indicator passed in via
 * `message.attachments` / `message.reactions` / `message.thread`.
 *
 * `isSelf` flips the row direction so the viewer's own messages appear on
 * the right — no bubble background/tint is applied; style the body via
 * `className` if you want classic chat bubbles.
 * @param props - Component props (see {@link MessageBubbleProps}).
 */
export function MessageBubble({
  message,
  isSelf,
  showMeta = true,
  className,
}: MessageBubbleProps): JSX.Element {
  const cm = getClassMap()
  const { author, body, timestamp, attachments, reactions, thread } = message
  return (
    <article
      className={cm.cn(
        cm.flex({ align: 'start', gap: 'sm', direction: isSelf ? 'row-reverse' : 'row' }),
        className,
      )}
    >
      <div className={cm.shrink0}>
        <Avatar src={author.avatarSrc} alt={author.name} name={author.name} size="sm" />
      </div>
      <div className={cm.cn(cm.flex1, cm.stack(1 as const))}>
        {showMeta && <MessageMeta author={author.name} timestamp={timestamp} />}
        <div className={cm.cn(cm.sp('p', 3))}>{body}</div>
        {attachments && <div className={cm.sp('mt', 1)}>{attachments}</div>}
        {reactions && <div className={cm.sp('mt', 1)}>{reactions}</div>}
        {thread && <div className={cm.sp('mt', 1)}>{thread}</div>}
      </div>
    </article>
  )
}
