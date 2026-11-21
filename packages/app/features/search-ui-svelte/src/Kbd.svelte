<!--
  Kbd: the Svelte counterpart of `@molecule/app-search-ui-react`'s `Kbd` —
  a key cap, for shortcut hints (`/` to focus, `↵` to open). The cap shows a
  key name, not prose (a physical key such as `esc` reads the same in every
  language), so it carries HTML's own `translate="no"`.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { KbdProps } from './types.js'

  let { children, className }: KbdProps = $props()

  const cm = $derived(getClassMap())
</script>

<kbd class={cm.cn(cm.kbd, className)} translate="no">{@render children?.()}</kbd>
