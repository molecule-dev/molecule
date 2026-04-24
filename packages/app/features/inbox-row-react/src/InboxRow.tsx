import type { ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Avatar } from '@molecule/app-ui-react'

interface InboxRowProps {
  /** Sender display. */
  sender: ReactNode
  /** Avatar URL fallback for sender. */
  senderAvatarSrc?: string
  /** Subject / headline. */
  subject: ReactNode
  /** Preview / first line of body. */
  preview?: ReactNode
  /** Display timestamp. */
  timestamp?: ReactNode
  /** Whether the message is unread (drives bold + dot). */
  unread?: boolean
  /** Whether the message is starred / flagged. */
  starred?: boolean
  /** Optional attachment indicator. */
  hasAttachment?: boolean
  /** Optional labels / tags chip row. */
  labels?: ReactNode
  /** Right-side selection slot (checkbox). */
  selectionSlot?: ReactNode
  /** Click handler — typically opens the message. */
  onClick?: () => void
  /** Star toggle. */
  onToggleStar?: () => void
  /** Extra classes. */
  className?: string
}

/**
 * Inbox / email message list row — sender + subject + preview +
 * timestamp + unread/star indicators. Generalizes beyond email to any
 * "message list" UI (chat lists, notification archives, ticket queues).
 * @param root0
 * @param root0.sender
 * @param root0.senderAvatarSrc
 * @param root0.subject
 * @param root0.preview
 * @param root0.timestamp
 * @param root0.unread
 * @param root0.starred
 * @param root0.hasAttachment
 * @param root0.labels
 * @param root0.selectionSlot
 * @param root0.onClick
 * @param root0.onToggleStar
 * @param root0.className
 */
export function InboxRow({
  sender,
  senderAvatarSrc,
  subject,
  preview,
  timestamp,
  unread,
  starred,
  hasAttachment,
  labels,
  selectionSlot,
  onClick,
  onToggleStar,
  className,
}: InboxRowProps) {
  const cm = getClassMap()
  const senderName = typeof sender === 'string' ? sender : 'Sender'
  return (
    <div
      onClick={onClick}
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.sp('px', 3),
        cm.sp('py', 2),
        onClick ? cm.cursorPointer : undefined,
        className,
      )}
      style={unread ? { fontWeight: 600 } : undefined}
    >
      {selectionSlot}
      {onToggleStar !== undefined && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleStar()
          }}
          aria-pressed={starred}
          aria-label={starred ? 'Unstar' : 'Star'}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 16,
            color: starred ? '#facc15' : 'rgba(0,0,0,0.3)',
          }}
        >
          ★
        </button>
      )}
      <Avatar src={senderAvatarSrc} alt={senderName} name={senderName} size="sm" />
      <div className={cm.cn(cm.flex1, cm.stack(0 as const))} style={{ minWidth: 0 }}>
        <div className={cm.flex({ align: 'baseline', gap: 'sm' })}>
          <span className={cm.textSize('sm')}>{sender}</span>
          {labels && <span className={cm.flex({ align: 'center', gap: 'xs' })}>{labels}</span>}
        </div>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <span className={cm.textSize('sm')}>{subject}</span>
          {preview && (
            <span className={cm.cn(cm.textSize('sm'), cm.sp('ml', 2))} style={{ opacity: 0.6 }}>
              — {preview}
            </span>
          )}
        </div>
      </div>
      {hasAttachment && <span aria-label="Has attachment">📎</span>}
      {unread && (
        <span
          aria-hidden
          style={{ width: 8, height: 8, borderRadius: '50%', background: '#60a5fa' }}
        />
      )}
      {timestamp && <span className={cm.cn(cm.textSize('xs'), cm.shrink0)}>{timestamp}</span>}
    </div>
  )
}
