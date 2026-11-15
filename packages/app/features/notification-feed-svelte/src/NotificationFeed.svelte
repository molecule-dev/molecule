<!--
  NotificationFeed: the Svelte counterpart of
  `@molecule/app-notification-feed-react`'s `NotificationFeed` — a list of
  notification rows with typed icon, title, body, relative time and unread
  indicator, each row optionally wrapped in a link. Same props (React names),
  same DOM for the same input.

  A row with an `href` renders the binding's `<Link>` (react-router's
  `<Link to>` contract) around the row card; a row without one renders the
  card in place, exactly as React does. Rows are keyed by `item.id`.
-->
<script lang="ts">
  import { Link } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { fmtRelativeShort } from './fmtRelativeShort.js'
  import type { FeedItem, NotificationFeedProps } from './types.js'

  let { items, ariaLabel, className, dataMolId }: NotificationFeedProps = $props()

  const cm = $derived(getClassMap())
</script>

{#snippet card(item: FeedItem)}
  <div
    class={cm.cn(
      cm.card(),
      cm.sp('p', 4),
      cm.flex({ align: 'start', gap: 'md' }),
      item.unread ? cm.notificationFeedUnreadAccent : '',
    )}
  >
    <div
      class={cm.cn(
        cm.shrink0,
        cm.flex({ align: 'center', justify: 'center' }),
        cm.roundedFull,
        cm.textPrimary,
        cm.notificationFeedIconTile,
      )}
    >
      <span class={cm.iconGlyphFont} aria-hidden="true">{item.icon}</span>
    </div>
    <div class={cm.cn(cm.flex1, cm.minW(0))}>
      <div class={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
        <h2 class={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>{item.title}</h2>
        <span class={cm.cn(cm.textSize('xs'), cm.textMuted, cm.notificationFeedTimestamp)}>
          {fmtRelativeShort(item.createdAt)}
        </span>
      </div>
      <p class={cm.cn(cm.textSize('sm'), cm.textMuted)}>{item.body}</p>
    </div>
  </div>
{/snippet}

<ul
  class={cm.cn(cm.notificationFeedList, className)}
  aria-label={ariaLabel}
  data-mol-id={dataMolId}
>
  {#each items as item (item.id)}
    <li>
      {#if item.href}
        <Link to={item.href} class={cm.displayBlock}>{@render card(item)}</Link>
      {:else}
        {@render card(item)}
      {/if}
    </li>
  {/each}
</ul>
