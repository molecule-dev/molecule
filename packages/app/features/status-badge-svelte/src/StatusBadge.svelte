<!--
  StatusBadge: the Svelte counterpart of `@molecule/app-status-badge-react`'s
  `StatusBadge` — maps a `StatusKind` to ClassMap badge color variants, as a
  framework `<Badge>` (`appearance='ui'`, default) or a compact uppercase pill.
  Same props (React names) and same DOM for the same input; `children` and
  `icon` are snippets.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'
  import { Badge } from '@molecule/app-ui-svelte'

  import type { StatusBadgeProps, StatusKind } from './types.js'

  let {
    kind = 'neutral',
    children,
    icon,
    appearance = 'ui',
    className,
  }: StatusBadgeProps = $props()

  const KIND_TO_COLOR: Record<StatusKind, 'success' | 'warning' | 'error' | 'info' | 'secondary'> =
    {
      success: 'success',
      warning: 'warning',
      error: 'error',
      info: 'info',
      neutral: 'secondary',
    }

  const cm = $derived(getClassMap())
</script>

{#if appearance === 'uppercase-pill'}
  <span
    class={cm.cn(
      cm.badge({ variant: KIND_TO_COLOR[kind] }),
      cm.uppercase,
      cm.trackingWide,
      className,
    )}
  >
    {#if icon}<span class={cm.sp('mr', 1)}>{@render icon()}</span>{/if}
    {@render children()}
  </span>
{:else}
  <Badge color={KIND_TO_COLOR[kind]} {className}>
    {#if icon}<span class={cm.sp('mr', 1)}>{@render icon()}</span>{/if}
    {@render children()}
  </Badge>
{/if}
