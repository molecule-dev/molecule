<!--
  AuthShellPanel: the Svelte counterpart of
  `@molecule/app-auth-shell-react`'s `AuthShellPanel` — the decorative
  brand-panel `<aside>` that collapses on mobile.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { AuthShellPanelProps } from './types.js'

  let { children, className, ...rest }: AuthShellPanelProps = $props()

  const cm = $derived(getClassMap())
</script>

<aside class={cm.cn(cm.authShellPanel, className)} {...rest}>
  {@render children?.()}
</aside>
