<!--
  ActivityTimelineRow: the Svelte counterpart of
  `@molecule/app-activity-timeline-react`'s `ActivityTimelineRow` — one row:
  header / description / meta / footer + a dot on the left, with the connector
  line drawn by the parent container. Same props (React names), same DOM for the
  same input.

  Node-valued event fields are snippets (a data prop's nodes become snippets in
  Svelte); a plain string or number renders as text, as React renders it.
  `wrapper` receives the row's own content as a snippet and its result replaces
  it — React's `wrapper(children)` render prop.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  import { getClassMap } from '@molecule/app-ui'

  import ActivityTimelineDot from './ActivityTimelineDot.svelte'
  import type { TimelineEventData, TimelineKindTone } from './types.js'

  /** The row's default tone when the caller passes none. */
  const DEFAULT_TONE: TimelineKindTone = { icon: 'event' }

  let {
    event,
    tone,
    wrapper,
  }: {
    event: TimelineEventData
    tone?: TimelineKindTone
    wrapper?: Snippet<[Snippet]>
  } = $props()

  const cm = $derived(getClassMap())
  const activeTone = $derived(tone ?? DEFAULT_TONE)

  /**
   * Whether a row field carries a snippet rather than plain text.
   *
   * @param value - The row field.
   * @returns True when the field renders as a snippet.
   */
  function isSnippet(value: unknown): value is Snippet {
    return typeof value === 'function'
  }

  /**
   * The text a field renders (React renders strings and numbers as text).
   *
   * @param value - The row field.
   * @returns The text, or `''` for an absent or snippet field.
   */
  function textOf(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  }
</script>

{#snippet inner()}
  <ActivityTimelineDot tone={activeTone} />
  <div>
    <div class={cm.cn(cm.flex({ justify: 'between', align: 'center' }), cm.sp('mb', 1))}>
      <!-- Title inherits the theme foreground from the card surface — no explicit color. -->
      <h3 class={cm.cn(cm.textSize('sm'), cm.fontWeight('bold'))}>
        {#if isSnippet(event.title)}{@render event.title()}{:else}{textOf(event.title)}{/if}
      </h3>
      {#if event.meta}
        <span
          class={cm.cn(cm.fontWeight('medium'), cm.textSize('xs'), cm.textMuted, cm.uppercase)}
          style="white-space: nowrap"
          >{#if isSnippet(event.meta)}{@render event.meta()}{:else}{textOf(event.meta)}{/if}</span
        >
      {/if}
    </div>
    {#if event.description}
      <p class={cm.cn(cm.textSize('xs'), cm.textMuted)}>
        {#if isSnippet(event.description)}{@render event.description()}{:else}{textOf(
            event.description,
          )}{/if}
      </p>
    {/if}
    {#if event.footer != null}
      {#if isSnippet(event.footer)}{@render event.footer()}{:else}{textOf(event.footer)}{/if}
    {/if}
  </div>
{/snippet}

<div class={cm.cn(cm.sp('pl', 10), cm.position('relative'))}>
  {#if wrapper}{@render wrapper(inner)}{:else}{@render inner()}{/if}
</div>
