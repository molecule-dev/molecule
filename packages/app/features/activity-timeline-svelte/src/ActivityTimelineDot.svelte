<!--
  ActivityTimelineDot: the Svelte counterpart of
  `@molecule/app-activity-timeline-react`'s `ActivityTimelineDot` — a single dot
  + icon marker. Same props (React names), same DOM for the same input.

  Consumer-supplied `dotClass`/`iconClass` win; the package defaults use theme
  tokens (subtle primary fill + primary icon) that read correctly in both light
  and dark — never a light-only literal.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { TimelineKindTone } from './types.js'

  let { tone, className }: { tone: TimelineKindTone; className?: string } = $props()

  const cm = $derived(getClassMap())
</script>

<div
  class={cm.cn(
    cm.flex({ align: 'center', justify: 'center' }),
    cm.w(6),
    cm.h(6),
    cm.position('absolute'),
    cm.roundedFull,
    tone.dotClass ?? cm.bgPrimarySubtle,
    tone.iconClass ?? cm.textPrimary,
    className,
  )}
  style="left: 0px; top: 0px"
>
  <span class={cm.cn(cm.textSize('xs'), cm.iconGlyphFont)}>{tone.icon}</span>
</div>
