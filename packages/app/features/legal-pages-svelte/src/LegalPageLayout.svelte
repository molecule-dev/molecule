<!--
  LegalPageLayout: the Svelte counterpart of
  `@molecule/app-legal-pages-react`'s `LegalPageLayout` — the canonical
  Terms / Privacy layout shell (container, h1 title, prose body stack). Same
  props, same DOM for the same input.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { LegalPageLayoutProps } from './types.js'

  let {
    dataMolId,
    title,
    children,
    containerSize = 'md',
    stackGap = 4,
    mainClassName,
    bodyClassName,
  }: LegalPageLayoutProps = $props()

  const cm = $derived(getClassMap())
</script>

<main
  data-mol-id={dataMolId}
  class={mainClassName ?? cm.cn(cm.container({ size: containerSize }), cm.sp('py', 12))}
>
  <h1 class={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 6))}>
    {@render title?.()}
  </h1>
  <div class={bodyClassName ?? cm.cn(cm.prose, cm.stack(stackGap))}>
    {@render children?.()}
  </div>
</main>
