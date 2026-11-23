<!--
  NodeEditorToggle: the Svelte counterpart of
  `@molecule/app-node-editor-panel-react`'s `NodeEditorToggle` — an iOS-style
  switch row with an optional leading icon tile. Same props (React names), same
  ClassMap tokens, same DOM for the same input; the switch is the `<Switch>`
  from `@molecule/app-ui-svelte`.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'
  import { Switch } from '@molecule/app-ui-svelte'

  import type { NodeEditorToggleProps } from './types.js'
  import { renders } from './utilities.js'

  let { title, subtitle, icon, checked, onChange, ariaLabel }: NodeEditorToggleProps = $props()

  const cm = $derived(getClassMap())

  // The switch is named by the title, and described by the subtitle when one
  // renders. `$props.id()` names the component instance; the two ids derive
  // from it, so each element has its own.
  const instanceId = $props.id()
  const titleId = `${instanceId}-title`
  const subtitleId = `${instanceId}-subtitle`
</script>

<div
  class={cm.cn(
    cm.sp('p', 4),
    cm.flex({ align: 'center', justify: 'between' }),
    cm.nodeEditorPanelToggleRow,
  )}
>
  <div class={cm.cn(cm.flex({ align: 'center' }), cm.nodeEditorPanelToggleGroup)}>
    {#if icon}
      <div class={cm.cn(cm.sp('p', 2), cm.nodeEditorPanelToggleIconTile)}>
        <span class={cm.cn(cm.textSize('sm'), cm.iconGlyphFont)}>{icon}</span>
      </div>
    {/if}
    <div>
      <p
        id={titleId}
        class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.nodeEditorPanelToggleTitle)}
      >
        {#if typeof title === 'function'}{@render title?.()}{:else}{title}{/if}
      </p>
      {#if renders(subtitle)}
        <p id={subtitleId} class={cm.cn(cm.nodeEditorPanelToggleSubtitle)}>
          {#if typeof subtitle === 'function'}{@render subtitle?.()}{:else}{subtitle}{/if}
        </p>
      {/if}
    </div>
  </div>
  <Switch
    size="sm"
    {checked}
    aria-label={ariaLabel}
    aria-labelledby={ariaLabel === undefined ? titleId : undefined}
    aria-describedby={renders(subtitle) ? subtitleId : undefined}
    data-mol-id="node-editor-toggle"
    onChange={(event) => onChange((event.target as HTMLInputElement).checked)}
  />
</div>
