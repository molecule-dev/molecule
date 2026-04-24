import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface ForumThreadRowProps {
  title: ReactNode
  /** Optional snippet of the OP body. */
  excerpt?: ReactNode
  /** Aggregate vote score / upvotes. */
  voteScore?: number
  /** Reply count. */
  replyCount?: number
  /** View count. */
  viewCount?: number
  /** Optional pinned indicator. */
  pinned?: boolean
  /** Optional locked indicator. */
  locked?: boolean
  /** Author display. */
  author?: ReactNode
  /** Created-at display (relative or absolute). */
  createdAt?: ReactNode
  /** Tag chips. */
  tags?: ReactNode
  /** Right-side voting controls slot. */
  voteControls?: ReactNode
  /** Click handler. */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}

/**
 * Forum / discussion-board thread row. Shows the title, optional
 * excerpt, vote score + reply/view counts, pin/lock badges, author,
 * and timestamp. Pass `voteControls` to render up/down buttons inline.
 * @param root0
 * @param root0.title
 * @param root0.excerpt
 * @param root0.voteScore
 * @param root0.replyCount
 * @param root0.viewCount
 * @param root0.pinned
 * @param root0.locked
 * @param root0.author
 * @param root0.createdAt
 * @param root0.tags
 * @param root0.voteControls
 * @param root0.onClick
 * @param root0.className
 */
export function ForumThreadRow({
  title,
  excerpt,
  voteScore,
  replyCount,
  viewCount,
  pinned,
  locked,
  author,
  createdAt,
  tags,
  voteControls,
  onClick,
  className,
}: ForumThreadRowProps) {
  const cm = getClassMap()
  return (
    <article
      onClick={onClick}
      className={cm.cn(
        cm.flex({ align: 'start', gap: 'sm' }),
        cm.sp('p', 3),
        onClick ? cm.cursorPointer : undefined,
        className,
      )}
    >
      {voteControls && <div className={cm.shrink0}>{voteControls}</div>}
      {voteScore !== undefined && !voteControls && (
        <div className={cm.cn(cm.shrink0, cm.textCenter, cm.stack(0 as const))}>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>{voteScore}</span>
          <span className={cm.textSize('xs')}>votes</span>
        </div>
      )}
      <div className={cm.cn(cm.flex1, cm.stack(1 as const))}>
        <header className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
          {pinned && (
            <span aria-label="Pinned" title="Pinned">
              📌
            </span>
          )}
          {locked && (
            <span aria-label="Locked" title="Locked">
              🔒
            </span>
          )}
          <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{title}</h3>
        </header>
        {excerpt && <p className={cm.textSize('sm')}>{excerpt}</p>}
        <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
          {author && (
            <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{author}</span>
          )}
          {createdAt && <span className={cm.textSize('xs')}>· {createdAt}</span>}
          {replyCount !== undefined && (
            <span className={cm.textSize('xs')}>· {replyCount} replies</span>
          )}
          {viewCount !== undefined && (
            <span className={cm.textSize('xs')}>· {viewCount} views</span>
          )}
        </div>
        {tags && (
          <div className={cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' })}>{tags}</div>
        )}
      </div>
    </article>
  )
}
