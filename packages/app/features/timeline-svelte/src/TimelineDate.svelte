<!--
  TimelineDate: the Svelte counterpart of `@molecule/app-timeline-react`'s
  `TimelineDate` — a date separator rendered between timeline groups. Same
  props (React names), same DOM for the same input; the label is the snippet.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { TimelineDateProps } from './types.js'

  let { children, className }: TimelineDateProps = $props()

  const cm = $derived(getClassMap())
</script>

<div
  class={cm.cn(
    cm.flex({ align: 'center', gap: 'sm' }),
    cm.sp('py', 2),
    cm.textSize('xs'),
    cm.fontWeight('semibold'),
    className,
  )}
>
  <span class={cm.flex1}>{@render children()}</span>
</div>
