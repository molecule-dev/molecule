<!--
  Inline activity card — compact, Claude Code-style, rendered in the chat
  timeline when an `activity` SSE event fires (a captured outbound side effect
  in dev: email/sms/push/webhook/channel).

  Svelte counterpart of `@molecule/app-ide-react`'s `ActivityCard` (see the
  React file for the design notes): the same props (React names), the same DOM
  for the same input, the same callbacks. Shows a per-type icon, a one-line
  `summary → recipient`, and a status pill. Clicking the card opens the
  Activity panel filtered to that event's type; a hover deepens the card's
  border while the pointer is over it, and a coarse pointer gives the whole
  card a 44px touch target.

  Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
  ClassMap can't express, written as style texts. All user-facing text goes
  through `t()`.
-->

<script module lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type * as types from '../types.js'

  /** Re-exported from the plain-TS contract module (src/types.ts). */
  export type ActivityCardProps = types.ActivityCardProps
</script>

<script lang="ts">
  import {
    activityIconName,
    activityStatusColors,
    activityStatusLabel,
    activitySummaryLine,
    CHAT_CARD_ICON_SIZE,
    chatCardStyle,
  } from '@molecule/app-ide-panel-logic'

  import { useCoarsePointer } from '../hooks/useViewport.js'
  import Icon from './Icon.svelte'

  let { activity, onActivityClick }: ActivityCardProps = $props()

  const { t, locale } = useTranslation()
  const cm = $derived(getClassMap())
  const isCoarse = useCoarsePointer()

  // React computes these once per render from the props; Svelte derives them so
  // the same values stay current across prop changes.
  const pill = $derived(activityStatusColors(activity.status))
  const clickable = $derived(Boolean(onActivityClick))

  // The shared helpers translate through panel-logic's static `t`, so these
  // read the locale store to follow a locale switch the way React's
  // whole-component re-render does.
  /** The one-line summary (`summary → recipient`, with the shared fallbacks). */
  const summaryLine = $derived.by(() => {
    void $locale
    return activitySummaryLine(activity)
  })

  /** The status pill's translated label. */
  const statusText = $derived.by(() => {
    void $locale
    return activityStatusLabel(activity.status)
  })

  /** The summary line's inline style text: one truncating line. */
  const SUMMARY_STYLE =
    'flex: 1; min-width: 0px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap'

  /** The status pill's inline style text (React's numbers: 10 → 10px, 999 → 999px). */
  const pillStyle = $derived(
    [
      'flex-shrink: 0',
      'font-size: 10px',
      'font-weight: 600',
      'text-transform: uppercase',
      'letter-spacing: 0.04em',
      'padding: 2px 7px',
      'border-radius: 999px',
      `color: ${pill.fg}`,
      `background: ${pill.bg}`,
    ].join('; '),
  )

  /**
   * The card container's inline style: the chat cards' chrome (with the radius
   * written as `px` — the neutral helper returns a unitless number, a React-ism
   * a style text does not take), the timeline's bottom rhythm and the
   * coarse-pointer touch target.
   */
  const rootStyle = $derived.by(() => {
    const { padding, borderRadius, border, background } = chatCardStyle()
    return [
      'display: flex',
      'align-items: center',
      'gap: 8px',
      'margin-bottom: 16px',
      `padding: ${padding}`,
      `border-radius: ${borderRadius}px`,
      `border: ${border}`,
      `background: ${background}`,
      // Touch: the whole card is the tap target — 44px standalone-control floor.
      $isCoarse && clickable ? 'min-height: 44px' : '',
      'text-align: left',
      `cursor: ${clickable ? 'pointer' : 'default'}`,
      'color: inherit',
      'transition: border-color 100ms',
    ]
      .filter(Boolean)
      .join('; ')
  })

  /**
   * Deepens the card's border while the pointer is over it (React's
   * `onMouseEnter`, which only exists on a clickable card).
   *
   * @param event - The native mouse event.
   */
  function onmouseenter(event: MouseEvent): void {
    if (!clickable) return
    ;(event.currentTarget as HTMLElement).style.border = chatCardStyle(undefined, 70).border
  }

  /**
   * Restores the resting border when the pointer leaves (React's
   * `onMouseLeave`).
   *
   * @param event - The native mouse event.
   */
  function onmouseleave(event: MouseEvent): void {
    if (!clickable) return
    ;(event.currentTarget as HTMLElement).style.border = chatCardStyle().border
  }
</script>

<!-- mol-bespoke-button: the whole CARD is the click target, sharing the chat
    cards' chrome via chatCardStyle() — a clickable card, not a CTA; its one
    design-token property is the inherited card colour. -->
<button
  type="button"
  data-mol-id={`activity-card-${activity.id}`}
  data-activity-type={activity.type}
  data-activity-status={activity.status}
  aria-label={t('ide.activity.cardAria', undefined, { defaultValue: 'View captured activity' })}
  class={cm.cn(cm.textSize('xs'), cm.w('full'))}
  style={rootStyle}
  onclick={() => onActivityClick?.(activity)}
  {onmouseenter}
  {onmouseleave}
>
  <Icon
    name={activityIconName(activity.type)}
    size={CHAT_CARD_ICON_SIZE}
    aria-hidden="true"
    style="flex-shrink: 0"
  />
  <span class={cm.textSize('xs')} style={SUMMARY_STYLE}>
    {summaryLine}
  </span>
  <span data-mol-id={`activity-status-${activity.id}`} style={pillStyle}>
    {statusText}
  </span>
</button>
