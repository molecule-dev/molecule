<!--
  NotificationBadge: the Svelte counterpart of
  `@molecule/app-notification-badge-react`'s `NotificationBadge` — a small
  count pill with `max+` overflow handling. Same props (React names), same DOM
  for the same input; the pill's inline size is applied through the CSSOM
  exactly as React applies it.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { type CSSStyle, reactStyle } from './style.js'
  import type { NotificationBadgeProps } from './types.js'

  let {
    count,
    hideOnZero = true,
    max = 99,
    variant = 'error',
    className,
  }: NotificationBadgeProps = $props()

  // Each variant maps to the background class emitted by a real ClassMap theme
  // token. `neutral` uses the `surface-secondary` surface token (what
  // `cm.surfaceSecondary` resolves to) — a visible neutral fill in both light
  // and dark themes.
  const VARIANT_BG: Record<NonNullable<NotificationBadgeProps['variant']>, string> = {
    error: 'bg-error',
    warning: 'bg-warning',
    info: 'bg-info',
    success: 'bg-success',
    neutral: 'bg-surface-secondary',
  }

  const cm = $derived(getClassMap())
  const shown = $derived(!(hideOnZero && count <= 0))
  const display = $derived(count > max ? `${max}+` : String(count))
  const classes = $derived(
    cm.cn(
      cm.flex({ align: 'center', justify: 'center' }),
      cm.sp('px', 1),
      cm.roundedFull,
      cm.textSize('xs'),
      cm.fontWeight('bold'),
      VARIANT_BG[variant],
      className,
    ),
  )
  const style: CSSStyle = { minWidth: '20px', height: '20px' }
</script>

{#if shown}<span aria-label={String(count)} class={classes} use:reactStyle={style}>{display}</span
  >{/if}
