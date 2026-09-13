/**
 * The one timestamp treatment for every chat timeline item — user and team
 * message headers, Synthase replies, and event cards. A small muted relative
 * time ("5 minutes ago") that advances with the clock, whose tooltip carries
 * the exact date and time.
 *
 * Presentational only: WHETHER an item shows its time (the `/timestamps`
 * preference, critical events, and collapsing a run of identical labels) is
 * decided once for the whole timeline by `planChatTimestamps`.
 *
 * @module
 */

import type { JSX } from 'react'

import { getLocale } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'
import { Tooltip } from '@molecule/app-ui-react/components/Tooltip.js'

import { useMinuteNow } from '../hooks/useChatTimestampsVisible.js'
import {
  formatChatFullTime,
  formatChatRelativeTime,
  resolveChatLocale,
} from './chat-timestamps-utilities.js'

/** Props for {@link ChatTimestamp}. */
export interface ChatTimestampProps {
  /** Epoch milliseconds of the message or event. */
  timestamp: number
  /**
   * `inline` sits inside an existing header row (the user message's name line);
   * `line` is its own row above a reply or card, aligned with that item's content.
   */
  variant?: 'inline' | 'line'
  /** Horizontal alignment for the `line` variant (centered notices center their time). */
  align?: 'left' | 'center'
}

/**
 * A chat item's timestamp.
 *
 * @param props - {@link ChatTimestampProps}.
 * @returns The rendered timestamp, or `null` for an invalid time.
 */
export function ChatTimestamp({
  timestamp,
  variant = 'inline',
  align = 'left',
}: ChatTimestampProps): JSX.Element | null {
  const now = useMinuteNow()
  if (!Number.isFinite(timestamp)) return null

  const cm = getClassMap()
  const locale = resolveChatLocale(getLocale)
  const label = (
    <time
      dateTime={new Date(timestamp).toISOString()}
      className={cm.textMuted}
      style={{ fontSize: 11, whiteSpace: 'nowrap', cursor: 'default' }}
      data-mol-id="chat-timestamp"
    >
      {/* The clock can lag a fresh item by up to a minute; never show a future time. */}
      {formatChatRelativeTime(timestamp, Math.max(now, timestamp), locale)}
    </time>
  )
  const withTooltip = (
    <Tooltip content={formatChatFullTime(timestamp, locale)} placement="top">
      {label}
    </Tooltip>
  )

  if (variant === 'inline') return withTooltip
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: align === 'center' ? 'center' : 'flex-start',
        lineHeight: 1.3,
        marginBottom: 2,
      }}
    >
      {withTooltip}
    </div>
  )
}
