/**
 * Inline activity card — compact, Claude Code-style, rendered in the chat
 * timeline when an `activity` SSE event fires (a captured outbound side effect
 * in dev: email/sms/push/webhook/channel).
 *
 * Vue counterpart of `@molecule/app-ide-react`'s `ActivityCard` (see that file
 * for the design notes): the same props (React names), the same DOM for the
 * same input, the same callbacks. Shows a per-type icon, a one-line
 * `summary → recipient`, and a status pill. Clicking the card opens the
 * Activity panel filtered to that event's type; a hover deepens the card's
 * border while the pointer is over it, and a coarse pointer gives the whole
 * card a 44px touch target.
 *
 * Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
 * ClassMap can't express. All user-facing text goes through `t()`.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNodeChild } from 'vue'

import type { Activity } from '@molecule/app-ide-panel-logic'
import {
  activityIconName,
  activityStatusColors,
  activityStatusLabel,
  activitySummaryLine,
  CHAT_CARD_ICON_SIZE,
  chatCardStyle,
} from '@molecule/app-ide-panel-logic'
import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { useCoarsePointer } from '../hooks/useViewport.js'
import { Icon } from './Icon.js'

/**
 * The container chrome shared by the chat timeline's boxed cards, with the
 * radius written as `px` the way the DOM takes it here (the neutral helper
 * returns a unitless number for React).
 *
 * @returns The card container's inline style object.
 */
function cardStyle(): Record<string, string> {
  const { padding, border, background } = chatCardStyle()
  return { padding, borderRadius: '8px', border, background }
}

/** Props for {@link ActivityCard} — the React prop names, React's own contract. */
export interface ActivityCardProps {
  /** The captured activity to render. */
  activity: Activity
  /**
   * Called when the card is clicked — should open the Activity panel filtered
   * to this activity. Omitted by a host that renders the card read-only: then
   * no click or hover handler is attached, the cursor says `default`, and a
   * coarse pointer gets no touch target.
   */
  onActivityClick?: (activity: Activity) => void
}

/**
 * Compact, clickable inline card for a single captured activity.
 *
 * @param props - See {@link ActivityCardProps}.
 * @returns The rendered activity card.
 */
export const ActivityCard = defineComponent({
  name: 'ActivityCard',
  inheritAttrs: false,
  props: {
    /** The captured activity to render. */
    activity: { type: Object as PropType<Activity>, required: true },
    /**
     * Called when the card is clicked — should open the Activity panel
     * filtered to this activity. `undefined` when the card is read-only.
     */
    onActivityClick: {
      type: Function as PropType<(activity: Activity) => void>,
      required: false,
      default: undefined,
    },
  },
  setup(props) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const isCoarse = useCoarsePointer()

    return (): VNodeChild => {
      const activity = props.activity
      const pill = activityStatusColors(activity.status)
      const clickable = Boolean(props.onActivityClick)

      /**
       * Deepens the card's border while the pointer is over it (React's
       * `onMouseEnter`, which only exists on a clickable card).
       * @param event - The native mouse event.
       */
      const onEnter = (event: MouseEvent): void => {
        if (!clickable) return
        ;(event.currentTarget as HTMLElement).style.border = chatCardStyle(undefined, 70).border
      }

      /**
       * Restores the resting border when the pointer leaves (React's
       * `onMouseLeave`).
       * @param event - The native mouse event.
       */
      const onLeave = (event: MouseEvent): void => {
        if (!clickable) return
        ;(event.currentTarget as HTMLElement).style.border = chatCardStyle().border
      }

      return h(
        'button',
        {
          type: 'button',
          'data-mol-id': `activity-card-${activity.id}`,
          'data-activity-type': activity.type,
          'data-activity-status': activity.status,
          onClick: clickable
            ? () => {
                props.onActivityClick?.(activity)
              }
            : undefined,
          'aria-label': t('ide.activity.cardAria', undefined, {
            defaultValue: 'View captured activity',
          }),
          class: cm.cn(cm.textSize('xs'), cm.w('full')),
          /* mol-bespoke-button: the whole CARD is the click target, sharing the
             chat cards' chrome via chatCardStyle() — a clickable card, not a
             CTA; its one design-token property is the inherited card colour. */
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            // One chat-timeline rhythm: bottom margin only, never a top margin
            // (matches ChatPanel's TIMELINE_ITEM_GAP so adjacent items never
            // collide — P4-05).
            marginBottom: '16px',
            // Shared card chrome: subtle primary tint + a uniform 1px border on
            // all sides. One source of truth with the other chat info cards
            // (chat-card-style).
            ...cardStyle(),
            // Touch: the whole card is the tap target — 44px standalone-control
            // floor.
            ...(isCoarse.value && clickable ? { minHeight: '44px' } : {}),
            textAlign: 'left',
            cursor: clickable ? 'pointer' : 'default',
            color: 'inherit',
            transition: 'border-color 100ms',
          },
          onMouseenter: onEnter,
          onMouseleave: onLeave,
        },
        [
          h(Icon, {
            name: activityIconName(activity.type),
            size: CHAT_CARD_ICON_SIZE,
            'aria-hidden': 'true',
            style: { flexShrink: '0' },
          }),
          h(
            'span',
            {
              class: cm.textSize('xs'),
              style: {
                flex: '1',
                minWidth: '0px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              },
            },
            [activitySummaryLine(activity)],
          ),
          h(
            'span',
            {
              'data-mol-id': `activity-status-${activity.id}`,
              style: {
                flexShrink: '0',
                fontSize: '10px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                padding: '2px 7px',
                borderRadius: '999px',
                color: pill.fg,
                background: pill.bg,
              },
            },
            [activityStatusLabel(activity.status)],
          ),
        ],
      )
    }
  },
})
