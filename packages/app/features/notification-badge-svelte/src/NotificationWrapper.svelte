<!--
  NotificationWrapper: the Svelte counterpart of
  `@molecule/app-notification-badge-react`'s `NotificationWrapper` — positions
  a `<NotificationBadge>` at a corner of any child element. Same props (React
  names), same DOM for the same input; the decorated child is the default
  snippet (`children`).
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import NotificationBadge from './NotificationBadge.svelte'
  import { type CSSStyle, reactStyle } from './style.js'
  import type { NotificationWrapperProps } from './types.js'

  let {
    children,
    count,
    hideOnZero = true,
    variant = 'error',
    placement = 'top-right',
    className,
  }: NotificationWrapperProps = $props()

  const cm = $derived(getClassMap())
  const classes = $derived(cm.cn(cm.position('relative'), className))
  const style = $derived.by((): CSSStyle => {
    const box: CSSStyle = { position: 'absolute' }
    if (placement.includes('top')) box.top = '-4px'
    if (placement.includes('bottom')) box.bottom = '-4px'
    if (placement.includes('right')) box.right = '-4px'
    if (placement.includes('left')) box.left = '-4px'
    return box
  })
</script>

<!-- The child and the badge are adjacent with no template whitespace between
     them: React renders the two child nodes with nothing in between, so any
     literal whitespace here would show up as an extra text node. -->
<span class={classes} style="display: inline-block"
  >{#if children}{@render children()}{/if}<span use:reactStyle={style}
    ><NotificationBadge {count} {hideOnZero} {variant} /></span
  ></span
>
