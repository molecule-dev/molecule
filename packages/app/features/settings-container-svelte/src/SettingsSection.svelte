<!--
  SettingsSection: the Svelte counterpart of
  `@molecule/app-settings-container-react`'s `SettingsSection` — a
  Card-wrapped titled section with an optional description, body content and
  an optional footer action row. Same props, same DOM for the same input; the
  node props are snippets or plain text.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'
  import { Card } from '@molecule/app-ui-svelte'

  import type { SettingsSectionProps } from './types.js'

  let { title, description, children, footer, className, dataMolId }: SettingsSectionProps =
    $props()

  const cm = $derived(getClassMap())
</script>

<Card {className} data-mol-id={dataMolId}>
  <div class={cm.stack(4)}>
    <header class={cm.stack(1)}>
      <h2 class={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
        {#if typeof title === 'function'}{@render title()}{:else if title != null}{title}{/if}
      </h2>
      {#if description}
        <p class={cm.textSize('sm')}>
          {#if typeof description === 'function'}{@render description()}{:else}{description}{/if}
        </p>
      {/if}
    </header>
    <div>
      {#if children}{@render children()}{/if}
    </div>
    {#if footer}
      <footer class={cm.flex({ justify: 'end', align: 'center', gap: 'sm' })}>
        {#if typeof footer === 'function'}{@render footer()}{:else}{footer}{/if}
      </footer>
    {/if}
  </div>
</Card>
