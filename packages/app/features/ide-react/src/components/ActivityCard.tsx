/**
 * Inline activity card — compact, Claude Code-style, rendered in the chat
 * timeline when an `activity` SSE event fires (a captured outbound side effect
 * in dev: email/sms/push/webhook/channel).
 *
 * Shows a per-type icon, a one-line `summary → recipient`, and a status pill.
 * Clicking the card opens the Activity panel filtered to that event's type.
 *
 * @module
 */

import type { JSX } from 'react'

import { t } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'

import type { Activity } from './activity-utilities.js'
import {
  activityIconName,
  activityStatusColors,
  activityStatusLabel,
  activitySummaryLine,
} from './activity-utilities.js'
import { CHAT_CARD_ICON_SIZE, chatCardBorder, chatCardStyle } from './chat-card-style.js'
import { Icon } from './Icon.js'

/**
 * Props for the inline {@link ActivityCard}.
 */
export interface ActivityCardProps {
  /** The captured activity to render. */
  activity: Activity
  /** Called when the card is clicked — should open the Activity panel filtered to this activity. */
  onActivityClick?: (activity: Activity) => void
}

/**
 * Compact, clickable inline card for a single captured activity.
 * @param props - Component props.
 * @returns The rendered activity card element.
 */
export function ActivityCard({ activity, onActivityClick }: ActivityCardProps): JSX.Element {
  const cm = getClassMap()
  const pill = activityStatusColors(activity.status)
  const clickable = Boolean(onActivityClick)

  return (
    <button
      type="button"
      data-mol-id={`activity-card-${activity.id}`}
      data-activity-type={activity.type}
      data-activity-status={activity.status}
      onClick={clickable ? () => onActivityClick!(activity) : undefined}
      aria-label={t('ide.activity.cardAria', undefined, { defaultValue: 'View captured activity' })}
      className={cm.cn(cm.textSize('xs'), cm.w('full'))}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        // One chat-timeline rhythm: bottom margin only, never a top margin (matches
        // ChatPanel's TIMELINE_ITEM_GAP so adjacent items never collide — P4-05).
        marginBottom: 16,
        // Shared card chrome: subtle primary tint + a uniform 1px border on all
        // sides. One source of truth with the other chat info cards (chat-card-style).
        ...chatCardStyle(),
        textAlign: 'left',
        cursor: clickable ? 'pointer' : 'default',
        color: 'inherit',
        transition: 'border-color 100ms',
      }}
      onMouseEnter={
        clickable
          ? (e) => {
              ;(e.currentTarget as HTMLElement).style.borderColor = chatCardBorder(undefined, 70)
            }
          : undefined
      }
      onMouseLeave={
        clickable
          ? (e) => {
              ;(e.currentTarget as HTMLElement).style.borderColor = chatCardBorder()
            }
          : undefined
      }
    >
      <Icon
        name={activityIconName(activity.type)}
        size={CHAT_CARD_ICON_SIZE}
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      />
      <span
        className={cm.textSize('xs')}
        style={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {activitySummaryLine(activity)}
      </span>
      <span
        data-mol-id={`activity-status-${activity.id}`}
        style={{
          flexShrink: 0,
          fontSize: 10,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          padding: '2px 7px',
          borderRadius: 999,
          color: pill.fg,
          background: pill.bg,
        }}
      >
        {activityStatusLabel(activity.status)}
      </span>
    </button>
  )
}
