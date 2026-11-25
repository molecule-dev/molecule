import type * as React from 'react'
import { type ReactNode, useId } from 'react'

import { useTranslation } from '@molecule/app-react'
import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Avatar } from '@molecule/app-ui-react'
import { Box, Pressable, Text } from '@molecule/app-ui-react/elements'

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
  /**
   * Click handler — typically opens the message. While it is set, the whole
   * row is clickable through a transparent native button laid over it, named
   * by the sender and the subject (two ids, `aria-labelledby="<senderId>
   * <subjectId>"`); the inner controls — the star toggle, the selection slot
   * and the labels slot — sit above that button and keep their own clicks.
   */
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
  preview: previewProp,
  timestamp: timestampProp,
  unread,
  starred,
  hasAttachment,
  labels: labelsProp,
  selectionSlot,
  onClick,
  onToggleStar,
  className,
}: InboxRowProps): React.JSX.Element {
  const preview = slot(previewProp)
  const timestamp = slot(timestampProp)
  const labels = slot(labelsProp)
  const { t } = useTranslation()
  const cm = getClassMap()
  /** Base of the two ids that name the open button (React's `useId`). */
  const nameId = useId()
  const senderId = onClick ? `${nameId}-sender` : undefined
  const subjectId = onClick ? `${nameId}-subject` : undefined
  const openLabelledBy = senderId && subjectId ? `${senderId} ${subjectId}` : undefined
  const senderName =
    typeof sender === 'string'
      ? sender
      : t('inboxRow.sender', undefined, { defaultValue: 'Sender' })

  /**
   * The row's open action: an empty, transparent native button covering the
   * whole row (Enter / Space activate it natively), named by the sender and
   * the subject. A sibling of the row's other controls, not their wrapper, so
   * a button may carry it.
   */
  const openButton = onClick ? (
    <Pressable
      as="button"
      type="button"
      aria-labelledby={openLabelledBy}
      data-mol-id="inbox-row-open"
      onClick={() => onClick()}
      /* mol-bespoke-button: the whole row is the hit area, not a CTA — an
         empty, transparent button over the row; the inline background/border/padding are
         native resets. */
      className={cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer)}
      style={{ padding: 0 }}
      webStyle={{ background: 'transparent', border: 'none' }}
    />
  ) : null

  /**
   * The star toggle. It paints above the open button in its positioned
   * wrapper (see `starControl`) and keeps its own clicks.
   */
  const starButton =
    onToggleStar !== undefined ? (
      <Pressable
        as="button"
        type="button"
        onClick={() => onToggleStar()}
        aria-pressed={starred}
        data-mol-id="inbox-row-star"
        aria-label={
          starred
            ? t('inboxRow.unstar', undefined, { defaultValue: 'Unstar' })
            : t('inboxRow.star', undefined, { defaultValue: 'Star' })
        }
        /* mol-bespoke-button: icon-only star toggle inside a list row, no
           label and no button surface — the glyph is the control. The colour
           is a ClassMap tone (warning when starred, muted text otherwise) so
           it follows the theme; 44px touch floor from the ClassMap. The
           inline declarations are the native resets. */
        className={cm.cn(
          cm.cursorPointer,
          cm.touchTarget,
          starred ? cm.textTone('warning') : cm.textMuted,
        )}
        webStyle={{ background: 'none', border: 'none', fontSize: 16 }}
      >
        ★
      </Pressable>
    ) : null

  /**
   * The star toggle as React renders it: inside a positioned wrapper while
   * the open button exists (the wrapper paints above it, so a click lands on
   * the toggle and never reaches the open button), bare otherwise.
   */
  const starControl =
    starButton && onClick ? (
      <Box as="span" className={cm.cn(cm.position('relative'))}>
        {starButton}
      </Box>
    ) : (
      starButton
    )

  /**
   * The selection slot as React renders it: inside a positioned wrapper while
   * the open button exists, bare otherwise.
   */
  const selectionControl = selectionSlot ? (
    onClick ? (
      <Box as="span" className={cm.cn(cm.position('relative'))}>
        {selectionSlot}
      </Box>
    ) : (
      selectionSlot
    )
  ) : null

  /**
   * The row's label text: sender + labels, subject + preview. The sender and
   * the subject carry the two ids that name the open button.
   */
  const labelRows = (
    <>
      <Box as="div" className={cm.flex({ align: 'baseline', gap: 'sm' })}>
        <Box as="span" id={senderId} className={cm.textSize('sm')}>
          {sender}
        </Box>
        {labels && (
          <Box
            as="span"
            className={cm.cn(
              cm.flex({ align: 'center', gap: 'xs' }),
              onClick ? cm.position('relative') : undefined,
            )}
          >
            {labels}
          </Box>
        )}
      </Box>
      <Box
        as="div"
        style={{ overflow: 'hidden' }}
        webStyle={{ textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        <Box as="span" id={subjectId} className={cm.textSize('sm')}>
          {subject}
        </Box>
        {preview && (
          <Box
            as="span"
            className={cm.cn(cm.textSize('sm'), cm.sp('ml', 2))}
            style={{ opacity: 0.6 }}
          >
            — {preview}
          </Box>
        )}
      </Box>
    </>
  )

  return (
    <Box
      as="div"
      className={cm.cn(
        cm.flex({ align: 'center', gap: 'sm' }),
        cm.sp('px', 3),
        cm.sp('py', 2),
        onClick ? cm.position('relative') : undefined,
        className,
      )}
      webStyle={unread ? { fontWeight: 600 } : undefined}
    >
      {openButton}
      {selectionControl}
      {starControl}
      <Avatar src={senderAvatarSrc} alt={senderName} name={senderName} size="sm" />
      <Box as="div" className={cm.cn(cm.flex1, cm.stack(0 as const))} style={{ minWidth: 0 }}>
        {labelRows}
      </Box>
      {hasAttachment && (
        <Text
          as="span"
          aria-label={t('inboxRow.hasAttachment', undefined, { defaultValue: 'Has attachment' })}
        >
          📎
        </Text>
      )}
      {unread && (
        <Box
          as="span"
          aria-hidden
          className={cm.bgTone('info')}
          style={{ width: 8, height: 8 }}
          webStyle={{ borderRadius: '50%' }}
        />
      )}
      {timestamp && (
        <Box as="span" className={cm.cn(cm.textSize('xs'), cm.shrink0)}>
          {timestamp}
        </Box>
      )}
    </Box>
  )
}
