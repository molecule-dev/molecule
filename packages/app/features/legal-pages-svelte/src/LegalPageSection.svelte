<!--
  LegalPageSection: the Svelte counterpart of
  `@molecule/app-legal-pages-react`'s `LegalPageSection` — one sub-section of a
  legal page (h2 + body) styled for use inside LegalPageLayout. Same props,
  same DOM for the same input.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { LegalPageSectionProps } from './types.js'

  let { title, children, stackGap = 2 }: LegalPageSectionProps = $props()

  const cm = $derived(getClassMap())
</script>

<section class={cm.stack(stackGap)}>
  <h2 class={cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'))}>{@render title?.()}</h2>
  {@render children?.()}
</section>
