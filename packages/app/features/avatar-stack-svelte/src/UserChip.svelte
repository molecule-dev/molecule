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

  let { name, src, subtitle, trailing, size = 'sm', className }: UserChipProps = $props()

  const cm = $derived(getClassMap())
</script>

<div class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), className)}>
  <Avatar {src} alt={name} {name} {size} />
  <div class={cm.cn(cm.flex1, cm.stack(0))}>
    <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>{name}</span>
    <!-- React's `{subtitle && …}`: a falsy subtitle renders nothing. -->
    {#if subtitle}
      <span class={cm.textSize('xs')}>
        {#if typeof subtitle === 'function'}{@render subtitle()}{:else}{subtitle}{/if}
      </span>
    {/if}
  </div>
  {#if trailing}{@render trailing()}{/if}
</div>
