<!--
  UserChip: the Svelte counterpart of `@molecule/app-avatar-stack-react`'s
  `UserChip` — avatar + name + optional subtitle row, with optional trailing
  content. Same props (React names), same DOM for the same input; `subtitle`
  and `trailing` carry the React node props as snippets or plain strings.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'
  import { Avatar } from '@molecule/app-ui-svelte'

  import type { UserChipProps } from './types.js'

  let {
    name,
    href,
    nameLinkProps,
    src,
    subtitle,
    trailing,
    size = 'sm',
    className,
    class: rootClass,
    onClick,
    ...rest
  }: UserChipProps = $props()

  const cm = $derived(getClassMap())
  const linkAttrs = $derived.by(() => {
    const { className, onClick, ...attrs } = nameLinkProps ?? {}
    return {
      ...attrs,
      onclick: onClick ?? attrs.onclick,
      class: cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), className, attrs.class),
    }
  })
</script>

<div
  {...rest}
  onclick={onClick ?? rest.onclick}
  class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), className, rootClass)}
>
  {#if href === undefined}
    <Avatar {src} alt={name} {name} {size} />
  {:else}
    <div aria-hidden="true"><Avatar {src} alt={name} {name} {size} /></div>
  {/if}
  <div class={cm.cn(cm.flex1, cm.stack(0))}>
    {#if href === undefined}
      <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>{name}</span>
    {:else}
      <a data-mol-id="user-chip-profile" {...linkAttrs} {href}>{name}</a>
    {/if}
    <!-- React's `{subtitle && …}`: a falsy subtitle renders nothing. -->
    {#if subtitle}
      <span class={cm.textSize('xs')}>
        {#if typeof subtitle === 'function'}{@render subtitle?.()}{:else}{subtitle}{/if}
      </span>
    {/if}
  </div>
  {#if trailing}{@render trailing?.()}{/if}
</div>
