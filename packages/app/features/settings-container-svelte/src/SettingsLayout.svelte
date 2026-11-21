<!--
  SettingsLayout: the Svelte counterpart of
  `@molecule/app-settings-container-react`'s `SettingsLayout` — two-column
  [sidebar, content] with an optional, non-sticky header above both. Same
  props, same DOM for the same input.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { SettingsLayoutProps } from './types.js'

  let { sidebar, children, header, className, dataMolId }: SettingsLayoutProps = $props()

  const cm = $derived(getClassMap())
</script>

<div data-mol-id={dataMolId} class={cm.cn(cm.stack(4), className)}>
  {#if header}{@render header()}{/if}
  <div class={cm.flex({ align: 'start', gap: 'lg' })}>
    <aside class={cm.shrink0}>
      {#if sidebar}{@render sidebar()}{/if}
    </aside>
    <main class={cm.flex1}>
      <div class={cm.stack(6)}>
        {#if children}{@render children()}{/if}
      </div>
    </main>
  </div>
</div>
