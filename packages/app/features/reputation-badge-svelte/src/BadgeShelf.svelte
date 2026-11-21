<!--
  BadgeShelf: the Svelte counterpart of
  `@molecule/app-reputation-badge-react`'s `BadgeShelf` — a row of earned-badge
  icons with a trailing `+N` overflow chip. Same props, same ClassMap tokens,
  same i18n keys, same DOM for the same input: no badges renders nothing at
  all, and `onClick` turns each icon (and the overflow chip, with `null`) into a
  button.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { Badge, BadgeShelfProps } from './types.js'

  let { badges, limit = 5, onClick, className }: BadgeShelfProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  const visible = $derived((badges ?? []).slice(0, limit))
  const overflow = $derived(Math.max(0, (badges?.length ?? 0) - visible.length))
  const interactive = $derived(typeof onClick === 'function')
  const shelfLabel = $derived(
    t(
      'badgeShelf.aria',
      { count: badges?.length ?? 0 },
      { defaultValue: '{{count}} badges earned' },
    ),
  )
  const overflowLabel = $derived(
    t(
      'badgeShelf.overflow.aria',
      { count: overflow },
      { defaultValue: 'Show {{count}} more badges' },
    ),
  )

  /**
   * The badge's native tooltip: its name, plus its description when set.
   *
   * @param badge - The badge.
   * @returns The tooltip text.
   */
  function tooltip(badge: Badge): string {
    return badge.description ? `${badge.name} — ${badge.description}` : badge.name
  }
</script>

{#snippet icon(badge: Badge)}
  {#if badge.iconSrc}
    <img
      src={badge.iconSrc}
      alt=""
      class={cm.cn(cm.shrink0)}
      style="width: 24px; height: 24px"
      data-mol-id="badge-shelf-icon-img"
    />
  {:else}
    <span aria-hidden="true" data-mol-id="badge-shelf-icon-glyph">{badge.icon ?? '*'}</span>
  {/if}
{/snippet}

{#if badges && badges.length > 0}
  <ul
    class={cm.cn(cm.flex({ align: 'center', gap: 'xs' }), className)}
    data-mol-id="badge-shelf"
    aria-label={shelfLabel}
  >
    {#each visible as badge (badge.id)}
      <li
        class={cm.cn(cm.flex({ align: 'center', justify: 'center' }))}
        data-mol-id="badge-shelf-item"
        data-badge-id={badge.id}
      >
        {#if interactive}
          <button
            type="button"
            class={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.roundedFull)}
            onclick={() => onClick?.(badge)}
            title={tooltip(badge)}
            aria-label={badge.name}
            data-mol-id="badge-shelf-button"
          >
            {@render icon(badge)}
          </button>
        {:else}
          <span title={tooltip(badge)} aria-label={badge.name} role="img">
            {@render icon(badge)}
          </span>
        {/if}
      </li>
    {/each}
    {#if overflow > 0}
      <li
        class={cm.cn(cm.flex({ align: 'center', justify: 'center' }))}
        data-mol-id="badge-shelf-overflow"
      >
        {#if interactive}
          <button
            type="button"
            class={cm.cn(
              cm.flex({ align: 'center', justify: 'center' }),
              cm.roundedFull,
              cm.textSize('xs'),
              cm.fontWeight('semibold'),
            )}
            onclick={() => onClick?.(null)}
            aria-label={overflowLabel}
            data-mol-id="badge-shelf-overflow-button">+{overflow}</button
          >
        {:else}
          <span
            class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
            aria-label={overflowLabel}>+{overflow}</span
          >
        {/if}
      </li>
    {/if}
  </ul>
{/if}
