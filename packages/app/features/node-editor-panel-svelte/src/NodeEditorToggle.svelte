<!--
  NodeEditorToggle: the Svelte counterpart of
  `@molecule/app-node-editor-panel-react`'s `NodeEditorToggle` — an iOS-style
  switch row with an optional leading icon tile. Same props (React names), same
  ClassMap tokens, same DOM for the same input; the switch is the `<Switch>`
  from `@molecule/app-ui-svelte`.
-->
<script lang="ts">
  import { ContentOrElse, PresentWhileContent } from '@molecule/app-svelte'
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

  // React's `slot(subtitle)`: a subtitle snippet that renders nothing (an empty list) leaves no
  // `<p>` and no `aria-describedby`, like an omitted one. A snippet's `{#each}` over no rows
  // changes the DOM without changing the prop, so the `<p>` reports what its subtitle renders.
  let subtitleRenders = $state<boolean>()
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
        <PresentWhileContent
          tag="p"
          present={subtitleRenders}
          id={subtitleId}
          class={cm.cn(cm.nodeEditorPanelToggleSubtitle)}
        >
          <ContentOrElse bind:present={subtitleRenders}>
            {#if typeof subtitle === 'function'}{@render subtitle?.()}{:else}{subtitle}{/if}
          </ContentOrElse>
        </PresentWhileContent>
      {/if}
    </div>
  </div>
  <Switch
    size="sm"
    {checked}
    aria-label={ariaLabel}
    aria-labelledby={ariaLabel === undefined ? titleId : undefined}
    aria-describedby={renders(subtitle) && subtitleRenders ? subtitleId : undefined}
    data-mol-id="node-editor-toggle"
    onChange={(event) => onChange((event.target as HTMLInputElement).checked)}
  />
</div>
