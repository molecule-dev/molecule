<!--
  ContactDisplay: the Svelte counterpart of `@molecule/app-contact-display-react`'s
  `ContactDisplay` — avatar + name + role + email/phone with leading glyphs +
  optional address and company, in card, row and compact layouts. Same props
  (React names), same DOM for the same input. `role`, `address` and `company`
  are node-valued: a snippet renders, plain text prints.

  With `onClick` a transparent native button covers the whole row (a click
  anywhere on it, Enter or Space activates the contact) and is named by the
  contact name; the mail/tel links and the `actions` slot sit above it and
  keep their own clicks.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'
  import { Avatar } from '@molecule/app-ui-svelte'

  import type { ContactDisplayProps } from './types.js'

  let { contact, layout = 'card', actions, onClick, className }: ContactDisplayProps = $props()

  const cm = $derived(getClassMap())
  const nameId = $props.id()
  const isCompact = $derived(layout === 'compact')
  const direction = $derived(layout === 'card' ? 'col' : 'row')
  const nameClass = $derived(
    cm.cn(cm.textSize(isCompact ? 'sm' : 'base'), cm.fontWeight('semibold')),
  )
  // The mail/tel links are controls: when the open button covers the row,
  // their line paints above it so a click on the link keeps its own action.
  const controlLineClass = $derived(
    onClick
      ? cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.textSize('sm'), cm.position('relative'))
      : cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.textSize('sm')),
  )
</script>

<div
  class={cm.cn(
    cm.flex({
      align: layout === 'card' ? 'start' : 'center',
      gap: isCompact ? 'sm' : 'md',
      direction,
    }),
    onClick ? cm.position('relative') : undefined,
    className,
  )}
>
  {#if onClick}
    <!-- The row's open control: a transparent native button covering the row
        (Enter / Space activate it natively), named by the contact name. First
        child, and a sibling — not a wrapper — of the row's inner controls, so
        those stay reachable controls. -->
    <button
      type="button"
      aria-labelledby={nameId}
      data-mol-id="contact-display-open"
      onclick={() => onClick?.()}
      class={cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer)}
      style:background="transparent"
      style:border="none"
      style:padding="0"
    ></button>
  {/if}
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
      {#if onClick}
        <span id={nameId} class={nameClass}>{contact.name}</span>
      {:else}
        <span class={nameClass}>{contact.name}</span>
      {/if}
      {#if contact.role}
        <span class={cm.textSize('xs')}>
          {#if typeof contact.role === 'function'}{@render contact.role?.()}{:else}{contact.role}{/if}
        </span>
      {/if}
    </div>
    {#if contact.company}
      <div class={cm.textSize('sm')}>
        {#if typeof contact.company === 'function'}{@render contact.company?.()}{:else}{contact.company}{/if}
      </div>
    {/if}
    {#if !isCompact && contact.email}
      <div class={controlLineClass}>
        <span aria-hidden="true">✉</span>
        <a href={`mailto:${contact.email}`} class={cm.link}>{contact.email}</a>
      </div>
    {/if}
    {#if !isCompact && contact.phone}
      <div class={controlLineClass}>
        <span aria-hidden="true">☎</span>
        <a href={`tel:${contact.phone}`} class={cm.link}>{contact.phone}</a>
      </div>
    {/if}
    {#if !isCompact && contact.address}
      <div class={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.textSize('sm'))}>
        <span aria-hidden="true">⌂</span>
        <span>
          {#if typeof contact.address === 'function'}{@render contact.address?.()}{:else}{contact.address}{/if}
        </span>
      </div>
    {/if}
  </div>
  {#if onClick && actions}
    <div class={cm.position('relative')}>
      {#if typeof actions === 'function'}{@render actions?.()}{:else}{actions}{/if}
    </div>
  {:else if actions}
    {#if typeof actions === 'function'}{@render actions?.()}{:else}{actions}{/if}
  {/if}
</div>
