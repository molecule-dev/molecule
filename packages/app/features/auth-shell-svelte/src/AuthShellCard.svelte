<!--
  AuthShellCard: the Svelte counterpart of
  `@molecule/app-auth-shell-react`'s `AuthShellCard` — the centered
  glassmorphic card surface with an overridable outer and inner treatment.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'
  import { reactStyleText } from '@molecule/app-ui-svelte'

  import type { AuthShellCardProps } from './types.js'

  let {
    children,
    surfaceClassName,
    className,
    outerClassName,
    dataMolId,
    style,
  }: AuthShellCardProps = $props()

  const cm = $derived(getClassMap())
  const outer = $derived(outerClassName ?? cm.cn(cm.w('full'), cm.authShellCardOuter))
</script>

<main class={outer}>
  <div
    class={cm.cn(
      cm.flex({ direction: 'col', gap: 'lg' }),
      cm.sp('p', 8),
      surfaceClassName ?? cm.authShellCardSurface,
      className,
    )}
    style={reactStyleText(style)}
    data-mol-id={dataMolId}
  >
    {@render children?.()}
  </div>
</main>
