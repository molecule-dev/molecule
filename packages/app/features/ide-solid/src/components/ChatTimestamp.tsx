/**
 * The one timestamp treatment for every chat timeline item — user and team
 * message headers, Synthase replies, and event cards. A small muted relative
 * time ("5 minutes ago") that advances with the clock, whose tooltip carries
 * the exact date and time.
 *
 * Solid counterpart of `@molecule/app-ide-react`'s `ChatTimestamp` (see that
 * file for the design notes): the same props (React names), the same DOM for
 * the same input. Presentational only: WHETHER an item shows its time is
 * decided once for the whole timeline by `planChatTimestamps`.
 *
 * Every prop read stays reactive (the body of a Solid component runs once, so
 * the branch reads live in JSX where the compiler wraps them in effects).
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout
 * the ClassMap can't express, in this framework's kebab-case with explicit
 * `px` (Solid does not add the unit React adds for a bare number).
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { Show } from 'solid-js'

import { formatChatFullTime, formatChatRelativeTime } from '@molecule/app-ide-panel-logic'
import { useLocale } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Tooltip } from '@molecule/app-ui-solid'

import { useMinuteNow } from '../hooks/useChatTimestampsVisible.js'

/** Props for {@link ChatTimestamp} — the React prop names, React's own contract. */
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
 * A chat item's timestamp, or nothing for an invalid time.
 *
 * @param props - See {@link ChatTimestampProps}.
 * @returns The rendered timestamp.
 */
export function ChatTimestamp(props: ChatTimestampProps): JSX.Element {
  const now = useMinuteNow()
  // Re-renders on a locale switch, so the label and its tooltip change language at once.
  const locale = useLocale()
  const cm = getClassMap()

  const label = (): JSX.Element => (
    <time
      datetime={new Date(props.timestamp).toISOString()}
      class={cm.textMuted}
      style={{ 'font-size': '11px', 'white-space': 'nowrap', cursor: 'default' }}
      data-mol-id="chat-timestamp"
    >
      {/* The clock can lag a fresh item by up to a minute; never show a future time. */}
      {formatChatRelativeTime(props.timestamp, Math.max(now(), props.timestamp), locale())}
    </time>
  )
  const withTooltip = (): JSX.Element => (
    <Tooltip content={formatChatFullTime(props.timestamp, locale())} placement="top">
      {label()}
    </Tooltip>
  )

  return (
    <Show when={Number.isFinite(props.timestamp)}>
      {props.variant !== 'line' ? (
        withTooltip()
      ) : (
        <div
          style={{
            display: 'flex',
            'justify-content': props.align === 'center' ? 'center' : 'flex-start',
            'line-height': '1.3',
            'margin-bottom': '2px',
          }}
        >
          {withTooltip()}
        </div>
      )}
    </Show>
  )
}
