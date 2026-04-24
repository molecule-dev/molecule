import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface MessageMetaProps {
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
 * @param root0
 * @param root0.author
 * @param root0.timestamp
 * @param root0.className
 */
export function MessageMeta({ author, timestamp, className }: MessageMetaProps) {
  const cm = getClassMap()
  return (
    <div className={cm.cn(cm.flex({ align: 'baseline', gap: 'sm' }), cm.textSize('xs'), className)}>
      <span className={cm.fontWeight('semibold')}>{author}</span>
      <span>{timestamp}</span>
    </div>
  )
}
