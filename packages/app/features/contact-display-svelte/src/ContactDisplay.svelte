<!--
  ContactDisplay: the Svelte counterpart of `@molecule/app-contact-display-react`'s
  `ContactDisplay` — avatar + name + role + email/phone with leading glyphs +
  optional address and company, in card, row and compact layouts. Same props
  (React names), same DOM for the same input. `role`, `address` and `company`
  are node-valued: a snippet renders, plain text prints.

  The `svelte-ignore` pair below marks the trade-off React's package documents:
  with `onClick` the row is a clickable div WITHOUT button semantics — wrap it
  in your own button/link (or add key handling) where keyboard access matters.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'
  import { Avatar } from '@molecule/app-ui-svelte'

  import type { ContactDisplayProps } from './types.js'

  let { contact, layout = 'card', actions, onClick, className }: ContactDisplayProps = $props()

  const cm = $derived(getClassMap())
  const isCompact = $derived(layout === 'compact')
  const direction = $derived(layout === 'card' ? 'col' : 'row')
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div
  class={cm.cn(
    cm.flex({
      align: layout === 'card' ? 'start' : 'center',
      gap: isCompact ? 'sm' : 'md',
      direction,
    }),
    onClick ? cm.cursorPointer : undefined,
    className,
  )}
  onclick={onClick}
>
  <div class={cm.shrink0}>
    <Avatar
      src={contact.avatarSrc}
      alt={contact.name}
      name={contact.name}
      size={isCompact ? 'sm' : 'md'}
    />
  </div>
  <div class={cm.cn(cm.flex1, cm.stack(1))}>
    <div class={cm.flex({ align: 'baseline', gap: 'sm' })}>
      <span class={cm.cn(cm.textSize(isCompact ? 'sm' : 'base'), cm.fontWeight('semibold'))}>
        {contact.name}
      </span>
      {#if contact.role}
        <span class={cm.textSize('xs')}>
          {#if typeof contact.role === 'function'}{@render contact.role()}{:else}{contact.role}{/if}
        </span>
      {/if}
    </div>
    {#if contact.company}
      <div class={cm.textSize('sm')}>
        {#if typeof contact.company === 'function'}{@render contact.company()}{:else}{contact.company}{/if}
      </div>
    {/if}
    {#if !isCompact && contact.email}
      <div class={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.textSize('sm'))}>
        <span aria-hidden="true">✉</span>
        <a href={`mailto:${contact.email}`} class={cm.link}>{contact.email}</a>
      </div>
    {/if}
    {#if !isCompact && contact.phone}
      <div class={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.textSize('sm'))}>
        <span aria-hidden="true">☎</span>
        <a href={`tel:${contact.phone}`} class={cm.link}>{contact.phone}</a>
      </div>
    {/if}
    {#if !isCompact && contact.address}
      <div class={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.textSize('sm'))}>
        <span aria-hidden="true">⌂</span>
        <span>
          {#if typeof contact.address === 'function'}{@render contact.address()}{:else}{contact.address}{/if}
        </span>
      </div>
    {/if}
  </div>
  {#if actions}
    {#if typeof actions === 'function'}{@render actions()}{:else}{actions}{/if}
  {/if}
</div>
