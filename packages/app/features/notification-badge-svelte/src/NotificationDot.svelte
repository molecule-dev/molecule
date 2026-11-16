<!--
  NotificationDot: the Svelte counterpart of
  `@molecule/app-notification-badge-react`'s `NotificationDot` — a tiny unread
  / presence indicator. Same props (React names), same DOM for the same input;
  the dot's inline size and position are applied through the CSSOM exactly as
  React applies them.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { type CSSStyle, reactStyle } from './style.js'
  import type { NotificationDotProps } from './types.js'

  let {
    visible = true,
    variant = 'error',
    size = 8,
    position = 'inline',
    className,
  }: NotificationDotProps = $props()

  // Each variant maps to the background class emitted by a real ClassMap theme
  // token. `neutral` uses the `surface-secondary` surface token (what
  // `cm.surfaceSecondary` resolves to) — a visible neutral fill in both light
  // and dark themes.
  const VARIANT_BG: Record<NonNullable<NotificationDotProps['variant']>, string> = {
    error: 'bg-error',
    warning: 'bg-warning',
    info: 'bg-info',
    success: 'bg-success',
    neutral: 'bg-surface-secondary',
  }

  const cm = $derived(getClassMap())
  const classes = $derived(cm.cn(cm.roundedFull, VARIANT_BG[variant], className))
  const style = $derived.by((): CSSStyle =>
    position === 'corner'
      ? { position: 'absolute', top: '2px', right: '2px', width: `${size}px`, height: `${size}px` }
      : { display: 'inline-block', width: `${size}px`, height: `${size}px` },
  )
</script>

{#if visible}<span aria-hidden="true" class={classes} use:reactStyle={style}></span>{/if}
