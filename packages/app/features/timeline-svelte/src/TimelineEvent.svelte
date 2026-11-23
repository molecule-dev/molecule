<!--
  TimelineEvent: the Svelte counterpart of `@molecule/app-timeline-react`'s
  `TimelineEvent` — one row of a `<Timeline>`: [rail (marker + connector)]
  [timestamp / title / body]. Same props (React names), same DOM for the same
  input; node fields may be plain text or snippets.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import TimelineRail from './TimelineRail.svelte'
  import type { TimelineEventProps } from './types.js'

  let { event, isLast = false, className }: TimelineEventProps = $props()

  const cm = $derived(getClassMap())
</script>

<div class={cm.cn(cm.flex({ align: 'stretch', gap: 'sm' }), className)}>
  <TimelineRail marker={event.marker} connector={!isLast} />
  <div class={cm.cn(cm.flex1, cm.stack(1 as const), cm.sp('pb', 4))}>
    <div class={cm.cn(cm.textSize('xs'), cm.fontWeight('medium'))}>
      {#if typeof event.timestamp === 'string' || typeof event.timestamp === 'number'}
        {event.timestamp}
      {:else}
        {@render event.timestamp?.()}
      {/if}
    </div>
    <div class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
      {#if typeof event.title === 'string' || typeof event.title === 'number'}
        {event.title}
      {:else}
        {@render event.title?.()}
      {/if}
    </div>
    {#if event.body}
      <div class={cm.textSize('sm')}>
        {#if typeof event.body === 'string' || typeof event.body === 'number'}
          {event.body}
        {:else}
          {@render event.body?.()}
        {/if}
      </div>
    {/if}
  </div>
</div>
