<!--
  AuthShellSplitRow: the Svelte counterpart of
  `@molecule/app-auth-shell-react`'s `AuthShellSplitRow` — the vertically
  flex-1 `<main>` row holding the brand panel and the card column.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { AuthShellSplitRowProps } from './types.js'

  let { children, className, ...rest }: AuthShellSplitRowProps = $props()

  const cm = $derived(getClassMap())
</script>

<main class={cm.cn(cm.flex1, className)} {...rest}>
  {@render children?.()}
</main>
