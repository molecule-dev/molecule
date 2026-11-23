<!--
  SettingsContent: the Svelte counterpart of
  `@molecule/app-settings-container-react`'s `SettingsContent` — a
  vertically-stacked wrapper for the right-hand column. Same props, same DOM
  for the same input.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { SettingsContentProps } from './types.js'

  let { children, className }: SettingsContentProps = $props()

  const cm = $derived(getClassMap())
</script>

<div class={cm.cn(cm.stack(6), className)}>
  {#if children}{@render children?.()}{/if}
</div>
