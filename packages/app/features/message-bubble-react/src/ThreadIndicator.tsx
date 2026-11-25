import type { JSX, ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Box, Pressable, Text } from '@molecule/app-ui-react/elements'

/** Props for {@link ThreadIndicator}. */
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
    <Pressable
      as="button"
      type="button"
      onClick={onOpen}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        cm.textSize('xs'),
        cm.link,
        className,
      )}
    >
      <Text as="span" className={cm.fontWeight('semibold')}>
        {t(
          'thread.replies',
          { count: replyCount },
          {
            count: replyCount,
            defaultValue: '{{count}} replies',
            defaultValue_one: '{{count}} reply',
          },
        )}
      </Text>
      {lastReplyAt && <Box as="span">· {lastReplyAt}</Box>}
    </Pressable>
  )
}
