<!--
  ActivityTimeline: the Svelte counterpart of
  `@molecule/app-activity-timeline-react`'s `ActivityTimeline` — vertical
  timeline with connector rail and per-kind dot markers. Same props (React
  names), same DOM for the same input.

  `header`/`footer` are snippets (a plain string or number renders as text);
  `rowWrapper` is a snippet called with the event and the row's own content, as
  React's render prop is.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  import { getClassMap } from '@molecule/app-ui'

  import ActivityTimelineRow from './ActivityTimelineRow.svelte'
  import type { TimelineEventData, TimelineKindTone } from './types.js'

  /** The tone an event gets when neither the map nor the default lists its kind. */
  const FALLBACK_TONE: TimelineKindTone = {
    icon: 'event',
  }

  let {
    events,
    toneByKind,
    defaultTone,
    rowWrapper,
    header,
    footer,
    className,
  }: {
    events: TimelineEventData[]
    toneByKind?: Record<string, TimelineKindTone>
    defaultTone?: TimelineKindTone
    rowWrapper?: Snippet<[TimelineEventData, Snippet]>
    header?: Snippet | string | number
    footer?: Snippet | string | number
    className?: string
  } = $props()

  const cm = $derived(getClassMap())

  /**
   * The tone a row renders: its kind's entry, else the case default, else the
   * generic dot.
   *
   * @param event - The row's event.
   * @returns Its tone.
   */
  function toneOf(event: TimelineEventData): TimelineKindTone {
    return toneByKind?.[event.kind] ?? defaultTone ?? FALLBACK_TONE
  }

  /**
   * Whether a node-valued prop carries a snippet rather than plain text.
   *
   * @param value - The prop.
   * @returns True when it renders as a snippet.
   */
  function isSnippet(value: unknown): value is Snippet {
    return typeof value === 'function'
  }

  /**
   * The text a node-valued prop renders.
   *
   * @param value - The prop.
   * @returns The text, or `''` for an absent or snippet value.
   */
  function textOf(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  }
</script>

<div class={cm.cn(cm.card(), cm.sp('p', 6), className)}>
  {#if header != null}{#if isSnippet(header)}{@render header()}{:else}{textOf(header)}{/if}{/if}
  <div class={cm.cn(cm.stack(8), cm.position('relative'))}>
    <!--
      Connector rail. Color comes from the theme border token (cm.bgBorder,
      light/dark aware); the exact geometry (offsets + 1px width) has no
      ClassMap resolver, so it stays inline. Absolutely positioned, so it is out
      of the flex flow and never affects row spacing.
    -->
    <span
      aria-hidden="true"
      class={cm.cn(cm.bgBorder)}
      style="position: absolute; left: 0.75rem; top: 0.5rem; bottom: 0.5rem; width: 1px"
    ></span>
    {#each events as event (event.id)}
      {@const tone = toneOf(event)}
      {#snippet curriedWrapper(children: Snippet)}
        {#if rowWrapper}{@render rowWrapper(event, children)}{/if}
      {/snippet}
      <ActivityTimelineRow {event} {tone} wrapper={rowWrapper ? curriedWrapper : undefined} />
    {/each}
  </div>
  {#if footer != null}{#if isSnippet(footer)}{@render footer()}{:else}{textOf(footer)}{/if}{/if}
</div>
