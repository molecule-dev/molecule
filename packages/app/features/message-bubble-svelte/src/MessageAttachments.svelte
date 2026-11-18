<!--
  MessageAttachments: the Svelte counterpart of
  `@molecule/app-message-bubble-react`'s `MessageAttachments` — a vertical list
  of attachment rows (`[icon] [name · size] [action]`). Same props (React names),
  same DOM for the same input; `icon` and `action` are snippets.

  The name and size spans are glued (`</span\n>{#if}`) so the template emits no
  whitespace text node between them: React renders none, and a stray space
  shifts the row by a pixel.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { MessageAttachmentsProps } from './types.js'

  let { attachments, className }: MessageAttachmentsProps = $props()

  const cm = $derived(getClassMap())
</script>

<div class={cm.cn(cm.stack(1), className)}>
  {#each attachments as attachment (attachment.id)}
    <div class={cm.flex({ align: 'center', gap: 'sm' })}>
      {#if attachment.icon}{@render attachment.icon()}{/if}
      <span class={cm.cn(cm.flex1, cm.textSize('sm'))}
        ><span class={cm.fontWeight('medium')}>{attachment.name}</span>{#if attachment.size}<span
            class={cm.sp('ml', 2)}>{attachment.size}</span
          >{/if}</span
      >
      {#if attachment.action}{@render attachment.action()}{/if}
    </div>
  {/each}
</div>
