<!--
  AuthShellDecoration: the Svelte counterpart of
  `@molecule/app-auth-shell-react`'s `AuthShellDecoration` — absolute-positioned
  background decoration (orbs, mesh gradients, radial glows).
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  import { getClassMap } from '@molecule/app-ui'

  let { children }: { children?: Snippet } = $props()

  const cm = $derived(getClassMap())
</script>

<div class={cm.cn(cm.authShellDecoration)}>{@render children?.()}</div>
