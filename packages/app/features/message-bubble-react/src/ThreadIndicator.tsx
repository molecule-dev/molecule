import type { JSX, ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

export interface ThreadIndicatorProps {
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
 * @param props - Component props (see {@link ThreadIndicatorProps}).
 */
export function ThreadIndicator({
  replyCount,
  lastReplyAt,
  onOpen,
  className,
}: ThreadIndicatorProps): JSX.Element {
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
