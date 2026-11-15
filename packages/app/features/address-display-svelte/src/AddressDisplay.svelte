<!--
  AddressDisplay: the Svelte counterpart of `@molecule/app-address-display-react`'s
  `AddressDisplay` — formatted multi-line (or inline) address with name, phone,
  leading icon, and action slots. Same props (React names), same DOM for the
  same input.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import type { Address, AddressDisplayProps } from './types.js'

  let {
    address,
    name,
    phone,
    leading,
    actions,
    inline = false,
    className,
  }: AddressDisplayProps = $props()

  const cm = $derived(getClassMap())
  const lines = $derived(joinAddress(address))

  /**
   * Converts an Address object into an ordered array of non-empty display lines.
   * @param a
   * @returns The non-empty display lines, in postal order.
   */
  function joinAddress(a: Address): string[] {
    const lines: string[] = []
    if (a.line1) lines.push(a.line1)
    if (a.line2) lines.push(a.line2)
    const cityState = [a.city, a.state].filter(Boolean).join(', ')
    const cityLine = [cityState, a.postalCode].filter(Boolean).join(' ')
    if (cityLine) lines.push(cityLine)
    if (a.country) lines.push(a.country)
    return lines
  }
</script>

<div class={cm.cn(cm.flex({ align: 'start', gap: 'sm' }), className)}>
  {#if leading}
    {#if typeof leading === 'function'}{@render leading()}{:else}{leading}{/if}
  {/if}
  <div class={cm.cn(cm.flex1, cm.stack(1), cm.textSize('sm'))}>
    {#if name}
      <span class={cm.fontWeight('semibold')}>
        {#if typeof name === 'function'}{@render name()}{:else}{name}{/if}
      </span>
    {/if}
    {#if inline}
      <span>{lines.join(', ')}</span>
    {:else}
      <address style="font-style: normal">
        {#each lines as line, i (i)}<span style="display: block">{line}</span>{/each}
      </address>
    {/if}
    {#if phone}
      <a href={`tel:${phone}`} class={cm.link}>{phone}</a>
    {/if}
  </div>
  {#if actions}
    {#if typeof actions === 'function'}{@render actions()}{:else}{actions}{/if}
  {/if}
</div>
