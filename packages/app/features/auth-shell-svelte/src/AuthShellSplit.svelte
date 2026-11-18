<!--
  AuthShellSplit: the Svelte counterpart of
  `@molecule/app-auth-shell-react`'s `AuthShellSplit` — the outer min-h-screen
  flex-column frame for a two-column brand-panel + card auth layout.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { AuthShellSplitProps } from './types.js'

  let { children, className, ...rest }: AuthShellSplitProps = $props()

  const cm = $derived(getClassMap())
</script>

<div class={cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), className)} {...rest}>
  {@render children?.()}
</div>
