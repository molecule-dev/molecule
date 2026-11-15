<!--
  EditorToolbar: the Svelte counterpart of
  `@molecule/app-editor-toolbar-react`'s `EditorToolbar` — editor-page top
  toolbar with title + optional version/status badge + primary actions +
  secondary icon actions. Same props (React names), same DOM for the same
  input; the title/badge/leading nodes are snippet slots. React keys each
  action button by its id, so the keyed `{#each}` moves/keeps the rendered
  buttons per key the same way.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'
  import { Button } from '@molecule/app-ui-svelte'

  import { reactStyle } from './style.js'
  import type { EditorToolbarProps, ToolbarAction } from './types.js'

  let {
    title,
    badge,
    primaryActions = [],
    secondaryActions = [],
    leading,
    sticky = true,
    className,
    dataMolId,
  }: EditorToolbarProps = $props()

  const cm = $derived(getClassMap())

  /** React's sticky inline style for the current `sticky` value. */
  const stickyStyle = $derived(sticky ? { position: 'sticky', top: '0px', zIndex: 10 } : undefined)

  /** React's divider inline style. */
  const dividerStyle = { width: '1px', height: '24px', opacity: 0.2, background: 'currentColor' }
</script>

{#snippet actionButton(action: ToolbarAction)}
  <Button
    variant={action.variant ?? 'ghost'}
    color={action.color}
    onClick={action.onClick}
    disabled={action.disabled}
  >
    {#if action.icon}
      {#if typeof action.icon === 'function'}{@render action.icon()}{:else}{action.icon}{/if}
    {/if}
    {#if action.label}
      <span>
        {#if typeof action.label === 'function'}{@render action.label()}{:else}{action.label}{/if}
      </span>
    {/if}
  </Button>
{/snippet}

<div
  class={cm.cn(
    cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
    cm.sp('px', 4),
    cm.sp('py', 2),
    className,
  )}
  data-mol-id={dataMolId}
  use:reactStyle={stickyStyle}
>
  <div class={cm.flex({ align: 'center', gap: 'sm' })}>
    {#if leading}{@render leading()}{/if}
    <h1 class={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
      {#if title}{@render title()}{/if}
    </h1>
    {#if badge}{@render badge()}{/if}
  </div>
  <div class={cm.flex({ align: 'center', gap: 'sm' })}>
    {#each primaryActions as action (action.id)}
      {#if action.href}
        <a href={action.href}>{@render actionButton(action)}</a>
      {:else}
        {@render actionButton(action)}
      {/if}
    {/each}
    {#if secondaryActions.length > 0 && primaryActions.length > 0}
      <span aria-hidden="true" use:reactStyle={dividerStyle}></span>
    {/if}
    {#each secondaryActions as action (action.id)}
      {#if action.href}
        <a href={action.href}>{@render actionButton(action)}</a>
      {:else}
        {@render actionButton(action)}
      {/if}
    {/each}
  </div>
</div>
