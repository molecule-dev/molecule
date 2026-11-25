import type { JSX, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Box } from '@molecule/app-ui-react/elements'

/** Props for {@link MessageMeta}. */
export interface MessageMetaProps {
  /** Author display name. */
  author: ReactNode
  /** Timestamp display. */
  timestamp: ReactNode
  /** Extra classes. */
  className?: string
}

/**
 * Small `[author · timestamp]` row rendered above a message body. Broken
 * out so apps can reuse it in notification rows, quote blocks, etc.
 * @param props - Component props (see {@link MessageMetaProps}).
 */
export function MessageMeta({ author, timestamp, className }: MessageMetaProps): JSX.Element {
  const cm = getClassMap()
  return (
    <Box
      as="div"
      className={cm.cn(cm.flex({ align: 'baseline', gap: 'sm' }), cm.textSize('xs'), className)}
    >
      <Box as="span" className={cm.fontWeight('semibold')}>
        {author}
      </Box>
      <Box as="span">{timestamp}</Box>
    </Box>
  )
}
