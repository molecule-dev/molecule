<!--
  AuthShellFooter: the Svelte counterpart of
  `@molecule/app-auth-shell-react`'s `AuthShellFooter` — small footer text with
  a top border inside the card.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  import { getClassMap } from '@molecule/app-ui'

  let { children }: { children?: Snippet } = $props()

  const cm = $derived(getClassMap())
</script>

<footer class={cm.cn(cm.textCenter, cm.textSize('sm'), cm.authShellFooter)}>
  {@render children?.()}
</footer>
