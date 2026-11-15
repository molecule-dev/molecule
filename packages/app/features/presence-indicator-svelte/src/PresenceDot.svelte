<!--
  PresenceDot: the Svelte counterpart of `@molecule/app-presence-indicator-react`'s
  `PresenceDot` — a small colored status circle (online/away/busy/offline).
  Same props (React names), same DOM for the same input; the dot's inline
  style is applied through the CSSOM exactly as React applies it.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { type CSSStyle, reactStyle } from './style.js'
  import type { PresenceDotProps, PresenceStatus } from './types.js'

  let {
    status,
    size = 10,
    position = 'inline',
    corner = 'bottom-right',
    ariaLabel,
    className,
  }: PresenceDotProps = $props()

  const STATUS_COLOR: Record<PresenceStatus, string> = {
    online: '#22c55e',
    away: '#eab308',
    busy: '#ef4444',
    offline: '#94a3b8',
  }

  const cm = $derived(getClassMap())
  const label = $derived(ariaLabel ?? `Presence: ${status}`)
  const style = $derived.by((): CSSStyle => {
    const styles: CSSStyle = {
      display: 'inline-block',
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      background: STATUS_COLOR[status],
    }
    if (position === 'overlay') {
      styles.boxShadow = '0 0 0 2px var(--color-surface, #fff)'
      styles.position = 'absolute'
      if (corner.includes('top')) styles.top = '0px'
      if (corner.includes('bottom')) styles.bottom = '0px'
      if (corner.includes('right')) styles.right = '0px'
      if (corner.includes('left')) styles.left = '0px'
    }
    return styles
  })
</script>

<span role="status" aria-label={label} class={cm.cn(className)} use:reactStyle={style}></span>
