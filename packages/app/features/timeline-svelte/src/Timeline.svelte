<!--
  Timeline: the Svelte counterpart of `@molecule/app-timeline-react`'s
  `Timeline` — a vertical chronological list of events, each rendered with a
  marker + connector on the left. Optional date separators come from the
  `renderDateSeparator` snippet; with no events and an empty state, React
  renders the empty state alone, so this template's root is that snippet then.
  Same props (React names), same DOM for the same input.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import TimelineEvent from './TimelineEvent.svelte'
  import type { TimelineProps } from './types.js'

  let { events, renderDateSeparator, emptyState, className }: TimelineProps = $props()

  const cm = $derived(getClassMap())
</script>

{#if events.length === 0 && emptyState}
  {#if typeof emptyState === 'string' || typeof emptyState === 'number'}
    {emptyState}
  {:else}
    {@render emptyState?.()}
  {/if}
{:else}
  <div class={cm.cn(cm.stack(0 as const), className)}>
    {#each events as event, i (event.id)}
      {@const prev = i > 0 ? events[i - 1] : undefined}
      <div>
        {#if renderDateSeparator}{@render renderDateSeparator?.(event, prev)}{/if}
        <TimelineEvent {event} isLast={i === events.length - 1} />
      </div>
    {/each}
  </div>
{/if}
