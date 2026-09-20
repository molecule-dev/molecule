import type * as React from 'react'
import type { ReactNode } from 'react'

import { t } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'
import { Avatar } from '@molecule/app-ui-react'

/** Props for {@link InboxRow}. */
export interface InboxRowProps {
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
 * @param props - Component props (see {@link InboxRowProps}).
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
}: InboxRowProps): React.JSX.Element {
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
          data-mol-id="inbox-row-star"
          aria-label={
            starred
              ? t('inboxRow.unstar', undefined, { defaultValue: 'Unstar' })
              : t('inboxRow.star', undefined, { defaultValue: 'Star' })
          }
          /* mol-bespoke-button: icon-only star toggle inside a list row, no
             label and no button surface — the glyph is the control. The
             inline colour is now a theme token (`#facc15` /
             `rgba(0,0,0,0.3)` ignored the theme and the unstarred glyph
             disappeared on a dark row); 44px touch floor from the ClassMap. */
          className={cm.cn(cm.cursorPointer, cm.touchTarget)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 16,
            color: starred
              ? 'var(--mol-color-warning, #facc15)'
              : 'var(--mol-color-border, rgba(128,128,128,0.5))',
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
