/**
 * Inline activity card — compact, Claude Code-style, rendered in the chat
 * timeline when an `activity` SSE event fires (a captured outbound side effect
 * in dev: email/sms/push/webhook/channel).
 *
 * Solid counterpart of `@molecule/app-ide-react`'s `ActivityCard` (see that
 * file for the design notes): the same props (React names), the same DOM for
 * the same input, the same callbacks. Shows a per-type icon, a one-line
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

import type { JSX } from 'solid-js'

import type { Activity } from '@molecule/app-ide-panel-logic'
import {
  activityIconName,
  activityStatusColors,
  activityStatusLabel,
  activitySummaryLine,
  CHAT_CARD_ICON_SIZE,
  chatCardStyle,
} from '@molecule/app-ide-panel-logic'
import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { useCoarsePointer } from '../hooks/useViewport.js'
import { Icon } from './Icon.jsx'

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
export function ActivityCard(props: ActivityCardProps): JSX.Element {
  const cm = getClassMap()
  const { t, locale } = useTranslation()
  const isCoarse = useCoarsePointer()

  // React computes these once per render from the props; Solid reads them
  // through accessors so the same values stay current between renders.
  const clickable = (): boolean => Boolean(props.onActivityClick)
  const pill = (): { fg: string; bg: string } => activityStatusColors(props.activity.status)

  /**
   * The one-line summary. The shared helper translates through panel-logic's
   * static `t`, so this reads the locale accessor to track a locale switch the
   * way React's whole-component re-render does.
   *
   * @returns The summary text.
   */
  const summaryLine = (): string => {
    locale()
    return activitySummaryLine(props.activity)
  }

  /**
   * The status pill's translated label, following a locale switch (see
   * {@link summaryLine}).
   *
   * @returns The label text.
   */
  const statusLabel = (): string => {
    locale()
    return activityStatusLabel(props.activity.status)
  }

  /**
   * The card container's inline style: the chat cards' chrome (with the radius
   * written as `px` — the neutral helper returns a unitless number, a React-ism
   * this framework's style objects do not take), the timeline's bottom rhythm
   * and the coarse-pointer touch target.
   *
   * @returns The style object.
   */
  const rootStyle = (): Record<string, string> => {
    const { padding, border, background } = chatCardStyle()
    return {
      display: 'flex',
      'align-items': 'center',
      gap: '8px',
      'margin-bottom': '16px',
      padding,
      'border-radius': '8px',
      border,
      background,
      // Touch: the whole card is the tap target — 44px standalone-control floor.
      ...(isCoarse() && clickable() ? { 'min-height': '44px' } : {}),
      'text-align': 'left',
      cursor: clickable() ? 'pointer' : 'default',
      color: 'inherit',
      transition: 'border-color 100ms',
    }
  }

  /**
   * Deepens the card's border while the pointer is over it (React's
   * `onMouseEnter`, which only exists on a clickable card).
   *
   * @param event - The native mouse event.
   */
  const onMouseEnter = (event: MouseEvent): void => {
    if (!clickable()) return
    ;(event.currentTarget as HTMLElement).style.border = chatCardStyle(undefined, 70).border
  }

  /**
   * Restores the resting border when the pointer leaves (React's
   * `onMouseLeave`).
   *
   * @param event - The native mouse event.
   */
  const onMouseLeave = (event: MouseEvent): void => {
    if (!clickable()) return
    ;(event.currentTarget as HTMLElement).style.border = chatCardStyle().border
  }

  return (
    <button
      type="button"
      data-mol-id={`activity-card-${props.activity.id}`}
      data-activity-type={props.activity.type}
      data-activity-status={props.activity.status}
      onClick={() => props.onActivityClick?.(props.activity)}
      aria-label={t('ide.activity.cardAria', undefined, {
        defaultValue: 'View captured activity',
      })}
      class={cm.cn(cm.textSize('xs'), cm.w('full'))}
      style={rootStyle()}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* mol-bespoke-button: the whole CARD is the click target, sharing the
          chat cards' chrome via chatCardStyle() — a clickable card, not a CTA;
          its one design-token property is the inherited card colour. */}
      <Icon
        name={activityIconName(props.activity.type)}
        size={CHAT_CARD_ICON_SIZE}
        aria-hidden="true"
        style={{ 'flex-shrink': '0' }}
      />
      <span
        class={cm.textSize('xs')}
        style={{
          flex: '1 1 0%',
          'min-width': '0px',
          overflow: 'hidden',
          'text-overflow': 'ellipsis',
          'white-space': 'nowrap',
        }}
      >
        {summaryLine()}
      </span>
      <span
        data-mol-id={`activity-status-${props.activity.id}`}
        style={{
          'flex-shrink': '0',
          'font-size': '10px',
          'font-weight': '600',
          'text-transform': 'uppercase',
          'letter-spacing': '0.04em',
          padding: '2px 7px',
          'border-radius': '999px',
          color: pill().fg,
          background: pill().bg,
        }}
      >
        {statusLabel()}
      </span>
    </button>
  )
}
