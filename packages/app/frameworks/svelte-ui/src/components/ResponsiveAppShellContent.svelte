<!--
  ResponsiveAppShellContent: the shell's <main> landmark. Grows to fill the
  row and may shrink below its content width (minWidth: 0), so page-level
  overflow-x strips scroll inside the page instead of widening the whole shell.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { reactStyle } from '../style.js'
  import type { ResponsiveAppShellContentProps } from '../types.js'

  let {
    children,
    className,
    style,
    dataMolId = 'shell-content',
    testId,
  }: ResponsiveAppShellContentProps = $props()

  const cm = $derived(getClassMap())
</script>

<main
  class={cm.cn(cm.flex1, className)}
  use:reactStyle={{ minWidth: 0, ...style }}
  data-mol-id={dataMolId}
  data-testid={testId}
>
  {@render children?.()}
</main>
