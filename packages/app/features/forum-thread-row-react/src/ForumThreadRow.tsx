import { type ReactNode, useId } from 'react'

import { useTranslation } from '@molecule/app-react'
import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'

/** Props for {@link ForumThreadRow}. */
export interface ForumThreadRowProps {
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
  /**
   * Activates the row: the whole row is clickable through a transparent native
   * button laid over it (Enter and Space activate it natively), named by the
   * title — the `<h3>` itself takes the generated id. The `voteControls` and
   * `tags` slots sit above that button and keep their own clicks.
   */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}

/**
 * Forum / discussion-board thread row. Shows the title, optional
 * excerpt, vote score + reply/view counts, pin/lock badges, author,
 * and timestamp. Pass `voteControls` to render up/down buttons inline.
 * @param props - Component props (see {@link ForumThreadRowProps}).
 */
export function ForumThreadRow({
  title,
  excerpt: excerptProp,
  voteScore,
  replyCount,
  viewCount,
  pinned,
  locked,
  author: authorProp,
  createdAt: createdAtProp,
  tags: tagsProp,
  voteControls: voteControlsProp,
  onClick,
  className,
}: ForumThreadRowProps): ReactNode {
  const excerpt = slot(excerptProp)
  const author = slot(authorProp)
  const createdAt = slot(createdAtProp)
  const tags = slot(tagsProp)
  const voteControls = slot(voteControlsProp)
  const cm = getClassMap()
  const { t } = useTranslation()
  // The marker labels and the counter labels are the row's own text: they go
  // through t(), with these English defaults what English renders.
  const pinnedLabel = t('forumThreadRow.aria.pinned', undefined, { defaultValue: 'Pinned' })
  const lockedLabel = t('forumThreadRow.aria.locked', undefined, { defaultValue: 'Locked' })
  const votesLabel = t('forumThreadRow.label.votes', undefined, { defaultValue: 'votes' })
  const repliesText =
    replyCount === undefined
      ? undefined
      : t(
          'forumThreadRow.label.replies',
          { count: replyCount },
          { defaultValue: '{{count}} replies' },
        )
  const viewsText =
    viewCount === undefined
      ? undefined
      : t('forumThreadRow.label.views', { count: viewCount }, { defaultValue: '{{count}} views' })
  // The open button is named by the title: the id goes on the `<h3>` itself,
  // so the row's accessible name is the thread title.
  const nameId = useId()
  return (
    <article
      className={cm.cn(
        cm.flex({ align: 'start', gap: 'sm' }),
        cm.sp('p', 3),
        onClick ? cm.position('relative') : undefined,
        className,
      )}
    >
      {onClick && (
        <button
          type="button"
          aria-labelledby={nameId}
          data-mol-id="forum-thread-row-open"
          onClick={() => onClick()}
          /* mol-bespoke-button: the whole row is the hit area, not a CTA — an
             empty, transparent button over the row; the inline background/
             border/padding are native resets. */
          className={cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer)}
          style={{ background: 'transparent', border: 'none', padding: 0 }}
        />
      )}
      {voteControls && (
        <div className={cm.cn(cm.shrink0, onClick ? cm.position('relative') : undefined)}>
          {voteControls}
        </div>
      )}
      {voteScore !== undefined && !voteControls && (
        <div className={cm.cn(cm.shrink0, cm.textCenter, cm.stack(0 as const))}>
          <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>{voteScore}</span>
          <span className={cm.textSize('xs')}>{votesLabel}</span>
        </div>
      )}
      <div className={cm.cn(cm.flex1, cm.stack(1 as const))}>
        <header className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
          {pinned && (
            <span role="img" aria-label={pinnedLabel} title={pinnedLabel}>
              📌
            </span>
          )}
          {locked && (
            <span role="img" aria-label={lockedLabel} title={lockedLabel}>
              🔒
            </span>
          )}
          <h3
            id={onClick ? nameId : undefined}
            className={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}
          >
            {title}
          </h3>
        </header>
        {excerpt && <p className={cm.textSize('sm')}>{excerpt}</p>}
        <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
          {author && (
            <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{author}</span>
          )}
          {createdAt && <span className={cm.textSize('xs')}>· {createdAt}</span>}
          {repliesText !== undefined && <span className={cm.textSize('xs')}>· {repliesText}</span>}
          {viewsText !== undefined && <span className={cm.textSize('xs')}>· {viewsText}</span>}
        </div>
        {tags && (
          <div
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }),
              onClick ? cm.position('relative') : undefined,
            )}
          >
            {tags}
          </div>
        )}
      </div>
    </article>
  )
}
