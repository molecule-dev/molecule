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
 * @param root0 - Component props.
 * @param root0.activity - The captured activity to render.
 * @param root0.onActivityClick - Callback fired when the card is clicked.
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
      className={cm.cn(cm.surfaceSecondary, cm.textSize('sm'), cm.w('full'))}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        margin: '4px 0',
        padding: '6px 10px',
        borderRadius: 6,
        border: '1px solid var(--mol-color-border, rgba(128,128,128,0.2))',
        textAlign: 'left',
        cursor: clickable ? 'pointer' : 'default',
        color: 'inherit',
        transition: 'border-color 100ms',
      }}
      onMouseEnter={
        clickable
          ? (e) => {
              ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary, #6366f1)'
            }
          : undefined
      }
      onMouseLeave={
        clickable
          ? (e) => {
              ;(e.currentTarget as HTMLElement).style.borderColor =
                'var(--mol-color-border, rgba(128,128,128,0.2))'
            }
          : undefined
      }
    >
      <Icon
        name={activityIconName(activity.type)}
        size={16}
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      />
      <span
        className={cm.textSize('sm')}
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
