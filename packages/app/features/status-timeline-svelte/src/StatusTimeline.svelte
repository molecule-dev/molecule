<!--
  StatusTimeline: the Svelte counterpart of `@molecule/app-status-timeline-react`'s
  `StatusTimeline` — a vertical ordered-step timeline whose dots are colored by
  reached state and whose current step's label is bolded. Same props, same DOM
  for the same input; the rows are keyed by the step's `key` value.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { StatusTimelineProps } from './types.js'

  let { steps, currentKey, ariaLabel, className, dataMolId }: StatusTimelineProps = $props()

  const cm = $derived(getClassMap())
  const currentIdx = $derived(steps.findIndex((s) => s.key === currentKey))
</script>

<ol
  class={cm.cn(cm.statusTimelineList, cm.textSize('sm'), className)}
  aria-label={ariaLabel}
  data-mol-id={dataMolId}
>
  {#each steps as step, i (step.key)}
    {@const reached = currentIdx >= 0 && i <= currentIdx}
    {@const isCurrent = i === currentIdx}
    <li class={cm.flex({ align: 'center', gap: 'sm' })}>
      <span
        class={cm.cn(
          cm.roundedFull,
          cm.statusTimelineDot,
          reached ? cm.bgPrimary : cm.statusTimelineDotIdle,
        )}
        aria-hidden="true"
      ></span>
      <span class={cm.cn(reached ? '' : cm.textMuted, isCurrent ? cm.fontWeight('semibold') : '')}
        >{step.label}</span
      >
    </li>
  {/each}
</ol>
