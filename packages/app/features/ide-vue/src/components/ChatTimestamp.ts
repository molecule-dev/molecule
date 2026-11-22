/**
 * The one timestamp treatment for every chat timeline item — user and team
 * message headers, Synthase replies, and event cards. A small muted relative
 * time ("5 minutes ago") that advances with the clock, whose tooltip carries
 * the exact date and time.
 *
 * Vue counterpart of `@molecule/app-ide-react`'s `ChatTimestamp` (see that
 * file for the design notes): the same props (React names), the same DOM for
 * the same input. Presentational only: WHETHER an item shows its time is
 * decided once for the whole timeline by `planChatTimestamps`.
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout
 * the ClassMap can't express, written the way the DOM takes them here (the
 * pixel values spell their `px`, which Vue does not add for React).
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNodeChild } from 'vue'

import { formatChatFullTime, formatChatRelativeTime } from '@molecule/app-ide-panel-logic'
import { getClassMap } from '@molecule/app-ui'
import { Tooltip } from '@molecule/app-ui-vue'
import { useLocale } from '@molecule/app-vue'

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
 * A chat item's timestamp, or `null` for an invalid time.
 *
 * @param props - See {@link ChatTimestampProps}.
 * @returns The rendered timestamp.
 */
export const ChatTimestamp = defineComponent({
  name: 'ChatTimestamp',
  props: {
    /** Epoch milliseconds of the message or event. */
    timestamp: { type: Number, required: true },
    /**
     * `inline` sits inside an existing header row; `line` is its own row above
     * a reply or card.
     */
    variant: {
      type: String as PropType<'inline' | 'line'>,
      required: false,
      default: 'inline',
    },
    /** Horizontal alignment for the `line` variant. */
    align: {
      type: String as PropType<'left' | 'center'>,
      required: false,
      default: 'left',
    },
  },
  setup(props) {
    const cm = getClassMap()
    const now = useMinuteNow()
    // Re-renders on a locale switch, so the label and its tooltip change language at once.
    const locale = useLocale()

    return (): VNodeChild => {
      if (!Number.isFinite(props.timestamp)) return null
      const label = h(
        'time',
        {
          datetime: new Date(props.timestamp).toISOString(),
          class: cm.textMuted,
          style: { fontSize: '11px', whiteSpace: 'nowrap', cursor: 'default' },
          'data-mol-id': 'chat-timestamp',
        },
        // The clock can lag a fresh item by up to a minute; never show a future time.
        formatChatRelativeTime(props.timestamp, Math.max(now.value, props.timestamp), locale.value),
      )
      const withTooltip = h(
        Tooltip,
        { content: formatChatFullTime(props.timestamp, locale.value), placement: 'top' },
        () => label,
      )
      if (props.variant === 'inline') return withTooltip
      return h(
        'div',
        {
          style: {
            display: 'flex',
            justifyContent: props.align === 'center' ? 'center' : 'flex-start',
            lineHeight: '1.3',
            marginBottom: '2px',
          },
        },
        [withTooltip],
      )
    }
  },
})
