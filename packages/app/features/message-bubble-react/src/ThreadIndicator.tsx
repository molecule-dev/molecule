import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

interface ThreadIndicatorProps {
  /** Number of replies. */
  replyCount: number
  /** Last-reply timestamp display. */
  lastReplyAt?: ReactNode
  /** Called when clicked. */
  onOpen?: () => void
  /** Extra classes. */
  className?: string
}

/**
 * "3 replies · last Monday" indicator rendered below a message bubble.
 * Clicking opens the thread view.
 * @param root0
 * @param root0.replyCount
 * @param root0.lastReplyAt
 * @param root0.onOpen
 * @param root0.className
 */
export function ThreadIndicator({
  replyCount,
  lastReplyAt,
  onOpen,
  className,
}: ThreadIndicatorProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        cm.textSize('xs'),
        cm.link,
        className,
      )}
    >
      <span className={cm.fontWeight('semibold')}>
        {t(
          'thread.replies',
          { count: replyCount },
          {
            defaultValue: replyCount === 1 ? '1 reply' : `${replyCount} replies`,
          },
        )}
      </span>
      {lastReplyAt && <span>· {lastReplyAt}</span>}
    </button>
  )
}
