<!--
  DayTimeline: the Svelte counterpart of `@molecule/app-day-timeline-react`'s
  `DayTimeline` — vertical 24h day-of-events timeline. Same props (React
  names), same ClassMap tokens, same inline styles, same DOM for the same
  input. Events are absolutely positioned by start/end hour and scaled by
  `pxPerHour` (total height = (endHour - startHour) * pxPerHour).

  Titles and subtitles are snippets (a data prop's nodes become snippets in
  Svelte), or plain text; every accessible string goes through `t()` so a
  locale switch re-renders it. Events are keyed by their `id`, so a re-passed
  or re-ordered event list keeps each card's DOM the way React's `key` does.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { formatHour } from './format.js'
  import type { DayTimelineEvent, DayTimelineProps } from './types.js'

  let {
    events,
    startHour = 0,
    endHour = 24,
    pxPerHour = 60,
    showAxisLabels = true,
    dataMolId,
    className,
  }: DayTimelineProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  // Every `t(…)` runs inside a `$derived`: it reads the i18n version under the
  // hood, so these re-run on a locale switch the way React's render-time `t`
  // calls re-run on a re-render.
  const groupLabel = $derived(t('dayTimeline.group', {}, { defaultValue: 'Day timeline' }))

  // Bounds are clamped exactly as React clamps them.
  const safeStart = $derived(Math.max(0, Math.min(24, startHour)))
  const safeEnd = $derived(Math.max(safeStart + 1, Math.min(24, endHour)))
  const totalHeight = $derived((safeEnd - safeStart) * pxPerHour)

  // Pre-build hour ticks.
  const ticks = $derived.by(() => {
    const hours: number[] = []
    for (let hour = Math.ceil(safeStart); hour < safeEnd; hour += 1) hours.push(hour)
    return hours
  })

  const ariaLabels = $derived.by(() => events.map((event) => eventAria(event)))

  /**
   * Whether an event field carries a snippet rather than plain text.
   *
   * @param value - The event field.
   * @returns True when the field renders as a snippet.
   */
  function isSnippet(value: unknown): value is Snippet {
    return typeof value === 'function'
  }

  /**
   * The text an event field renders (React renders strings and numbers as
   * text).
   *
   * @param value - The event field.
   * @returns The text, or `''` for an absent or snippet value.
   */
  function textOf(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  }

  /**
   * The event's clamped end hour (a 15-minute floor keeps tiny events
   * clickable).
   *
   * @param event - The event.
   * @returns Its clamped end hour.
   */
  function safeEndOf(event: DayTimelineEvent): number {
    return Math.max(event.endHour, event.startHour + 0.25)
  }

  /**
   * The event's accessible label, built from the same i18n key and default
   * message React uses (only a plain string title is carried into it).
   *
   * @param event - The event.
   * @returns The aria label.
   */
  function eventAria(event: DayTimelineEvent): string {
    return t(
      'dayTimeline.event',
      {
        title: typeof event.title === 'string' ? event.title : '',
        start: formatHour(event.startHour),
        end: formatHour(safeEndOf(event)),
      },
      { defaultValue: '{{title}} from {{start}} to {{end}}' },
    )
  }

  /**
   * The card's paper is the theme's secondary surface (`cm.surfaceSecondary`
   * class beside the accent recipe); the accent bar reads the event's own
   * `accentColor` when it has one, and is the brand primary otherwise (the
   * recipe's `primary` tone).
   *
   * @param event - The event the card shows.
   * @returns The card's accent-card tone.
   */
  function cardTone(event: DayTimelineEvent): 'custom' | 'primary' {
    return event.accentColor ? 'custom' : 'primary'
  }

  /**
   * The card's inline style. Numbers carry their unit in the string, because
   * only React's style object adds `px` to a bare number; the serialized
   * style is what every framework must match.
   *
   * @param event - The event the card shows.
   * @returns The card's inline style.
   */
  function cardStyle(event: DayTimelineEvent): string {
    const top = (event.startHour - safeStart) * pxPerHour
    const height = Math.max(20, (safeEndOf(event) - event.startHour) * pxPerHour)
    return [
      'position: absolute',
      `top: ${top}px`,
      'left: 6px',
      'right: 6px',
      `height: ${height}px`,
      'border-radius: 6px',
      'overflow: hidden',
      // The event's accent color drives an inset bar, not a border-left.
      // Without it the bar is the brand primary, through the recipe's
      // `primary` tone.
      ...(event.accentColor ? [`--mol-accent: ${event.accentColor}`] : []),
    ].join('; ')
  }

  /**
   * The content block's inline style: it fills the card so the whole surface
   * is the click target, and its 30px left padding keeps the text clear of
   * the accent bar.
   *
   * @param event - The event the block belongs to.
   * @returns The block's inline style.
   */
  function contentStyle(event: DayTimelineEvent): string {
    const parts = [
      'position: absolute',
      'inset: 0px',
      'padding: 0.4rem 0.6rem 0.4rem 30px',
      'font: inherit',
      'color: inherit',
      'text-align: left',
    ]
    if (event.onClick) parts.push('cursor: pointer', 'background: transparent')
    return parts.join('; ')
  }
</script>

<div
  class={cm.cn(className)}
  data-mol-id={dataMolId ?? 'day-timeline'}
  role="list"
  aria-label={groupLabel}
  style="position: relative; display: grid; grid-template-columns: {showAxisLabels
    ? '64px 1fr'
    : '1fr'}; min-height: {totalHeight}px"
>
  {#if showAxisLabels}
    <div style="position: relative; height: {totalHeight}px" aria-hidden="true">
      {#each ticks as hour (hour)}
        <div
          data-axis-tick={hour}
          class={cm.cn(cm.textSize('xs'), cm.textMuted)}
          style="position: absolute; top: {(hour - safeStart) *
            pxPerHour}px; right: 8px; transform: translateY(-50%)"
        >
          {formatHour(hour)}
        </div>
      {/each}
    </div>
  {/if}
  <div
    class={showAxisLabels ? cm.borderL : undefined}
    data-mol-id="day-timeline-rail"
    style="position: relative; height: {totalHeight}px"
  >
    {#each ticks as hour (hour)}
      <div
        aria-hidden="true"
        class={cm.bgBorder}
        style="position: absolute; top: {(hour - safeStart) *
          pxPerHour}px; left: 0px; right: 0px; height: 1px"
      ></div>
    {/each}
    {#each events as event, i (event.id)}
      <div
        role="listitem"
        data-event-id={event.id}
        data-mol-id="day-timeline-event"
        aria-label={ariaLabels[i]}
        class={cm.cn(cm.accentCard({ tone: cardTone(event) }), cm.surfaceSecondary)}
        style={cardStyle(event)}
      >
        {#if event.onClick}
          <button
            type="button"
            data-mol-id="day-timeline-event-action"
            aria-label={ariaLabels[i]}
            onclick={event.onClick}
            style={contentStyle(event)}
          >
            <div class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
              {#if isSnippet(event.title)}{@render event.title()}{:else}{textOf(event.title)}{/if}
            </div>
            {#if event.subtitle}
              <div class={cm.accentCardLabel({ tone: cardTone(event) })}>
                {#if isSnippet(event.subtitle)}{@render event.subtitle()}{:else}{textOf(
                    event.subtitle,
                  )}{/if}
              </div>
            {/if}
          </button>
        {:else}
          <div style={contentStyle(event)}>
            <div class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
              {#if isSnippet(event.title)}{@render event.title()}{:else}{textOf(event.title)}{/if}
            </div>
            {#if event.subtitle}
              <div class={cm.accentCardLabel({ tone: cardTone(event) })}>
                {#if isSnippet(event.subtitle)}{@render event.subtitle()}{:else}{textOf(
                    event.subtitle,
                  )}{/if}
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>
