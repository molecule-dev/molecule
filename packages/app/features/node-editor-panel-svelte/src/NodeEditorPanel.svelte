<!--
  NodeEditorPanel: the Svelte counterpart of
  `@molecule/app-node-editor-panel-react`'s `NodeEditorPanel` — the right-side
  properties-panel chrome: title row with close button, scrollable body and a
  sticky footer for the save bar + status messages. Same props (React names),
  same ClassMap tokens, same DOM for the same input.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { NodeEditorPanelProps } from './types.js'
  import { renders } from './utilities.js'

  let { title, children, footer, onClose, closeAriaLabel, widthClass }: NodeEditorPanelProps =
    $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()
</script>

<aside
  class={cm.cn(
    cm.flex({ direction: 'col' }),
    widthClass ? widthClass : cm.w(80),
    cm.nodeEditorPanelAside,
  )}
>
  <div
    class={cm.cn(
      cm.sp('p', 6),
      cm.flex({ align: 'center', justify: 'between' }),
      cm.nodeEditorPanelHeader,
    )}
  >
    <h2 class={cm.cn(cm.fontWeight('bold'), cm.nodeEditorPanelTitle)}>
      {#if typeof title === 'function'}{@render title()}{:else}{title}{/if}
    </h2>
    {#if onClose}
      <button
        type="button"
        data-mol-id="node-editor-panel-close"
        class={cm.cn(cm.dialogClose, cm.touchTarget)}
        aria-label={closeAriaLabel ??
          t('nodeEditorPanel.close', {}, { defaultValue: 'Close panel' })}
        onclick={(event) => onClose?.(event)}
      >
        <span class={cm.iconGlyphFont}>close</span>
      </button>
    {/if}
  </div>
  <div class={cm.cn(cm.flex1, cm.sp('p', 6), cm.stack(8), cm.nodeEditorPanelBody)}>
    {#if children}{@render children()}{/if}
  </div>
  {#if renders(footer)}
    <div class={cm.cn(cm.sp('p', 6), cm.nodeEditorPanelFooter)}>
      {#if typeof footer === 'function'}{@render footer()}{:else}{footer}{/if}
    </div>
  {/if}
</aside>
