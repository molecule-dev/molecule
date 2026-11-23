<!--
  VendorCard: the Svelte counterpart of `@molecule/app-vendor-card-react`'s
  `VendorCard` — Avatar/logo + name + tagline + rating/review count +
  member-since + badges + actions row, on the shared Card. Same props (React
  names), same DOM for the same input; string-or-snippet props carry the
  React text slots.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'
  import { Avatar, Card } from '@molecule/app-ui-svelte'

  import type { VendorCardProps } from './types.js'

  let {
    name,
    logoSrc,
    description,
    rating,
    reviewCount,
    memberSince,
    badges,
    actions,
    onClick,
    className,
  }: VendorCardProps = $props()

  const cm = $derived(getClassMap())
  const displayName = $derived(typeof name === 'string' ? name : 'Vendor')
</script>

<Card {className} {onClick}>
  <div class={cm.flex({ align: 'start', gap: 'md' })}>
    <Avatar src={logoSrc} alt={displayName} name={displayName} size="lg" />
    <div class={cm.cn(cm.flex1, cm.stack(2))}>
      <header>
        <h3 class={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
          {#if typeof name === 'function'}{@render name?.()}{:else}{name}{/if}
        </h3>
        <!-- React's `{description && …}`: a falsy description renders nothing. -->
        {#if description}
          <p class={cm.textSize('sm')}>
            {#if typeof description === 'function'}{@render description?.()}{:else}{description}{/if}
          </p>
        {/if}
      </header>
      <div class={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
        <!-- React's `rating !== undefined`: a zero rating still renders. -->
        {#if rating !== undefined}
          <span class={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.textSize('sm'))}>
            <span aria-hidden="true">★</span>
            <span class={cm.fontWeight('semibold')}>{rating.toFixed(1)}</span>
            {#if reviewCount !== undefined}
              <span>{`(${reviewCount})`}</span>
            {/if}
          </span>
        {/if}
        {#if memberSince}
          <span class={cm.textSize('xs')}>
            · {#if typeof memberSince === 'function'}{@render memberSince?.()}{:else}{memberSince}{/if}
          </span>
        {/if}
        {#if typeof badges === 'function'}{@render badges?.()}{:else}{badges}{/if}
      </div>
      <!-- React's `{actions && …}`: a falsy actions row renders nothing. -->
      {#if actions}
        <div class={cm.flex({ align: 'center', gap: 'sm' })}>
          {#if typeof actions === 'function'}{@render actions?.()}{:else}{actions}{/if}
        </div>
      {/if}
    </div>
  </div>
</Card>
