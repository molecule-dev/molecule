import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'

interface NoteCardProps {
  /** Note title. */
  title?: ReactNode
  /** Note body text. */
  body: ReactNode
  /** Background tint (CSS color). */
  color?: string
  /** Optional pin / starred indicator. */
  pinned?: boolean
  /** Optional last-modified display. */
  modifiedAt?: ReactNode
  /** Optional right-side actions (edit, archive, delete). */
  actions?: ReactNode
  /** Click handler. */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}

/**
 * Sticky-note style card with optional color tint, pinned indicator,
 * and bottom-right actions. Use for note-taking apps, digital
 * post-its, dashboard quick-notes.
 * @param root0
 * @param root0.title
 * @param root0.body
 * @param root0.color
 * @param root0.pinned
 * @param root0.modifiedAt
 * @param root0.actions
 * @param root0.onClick
 * @param root0.className
 */
export function NoteCard({
  title,
  body,
  color,
  pinned,
  modifiedAt,
  actions,
  onClick,
  className,
}: NoteCardProps) {
  const cm = getClassMap()
  return (
    <article
      onClick={onClick}
      className={cm.cn(
        cm.stack(2),
        cm.sp('p', 3),
        onClick ? cm.cursorPointer : undefined,
        className,
      )}
      style={{
        background: color ?? '#fef3c7',
        color: '#1f2937',
        borderRadius: 8,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        position: 'relative',
      }}
    >
      {pinned && (
        <span aria-label="Pinned" style={{ position: 'absolute', top: 6, right: 6 }}>
          📌
        </span>
      )}
      {title && <h3 className={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>{title}</h3>}
      <div className={cm.textSize('sm')} style={{ whiteSpace: 'pre-wrap' }}>
        {body}
      </div>
      {(modifiedAt || actions) && (
        <footer className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
          {modifiedAt && <span className={cm.textSize('xs')}>{modifiedAt}</span>}
          {actions}
        </footer>
      )}
    </article>
  )
}
