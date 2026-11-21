<!--
  PresenceDot: the Svelte counterpart of `@molecule/app-presence-indicator-react`'s
  `PresenceDot` — a small colored status circle (online/away/busy/offline).
  Same props (React names), same DOM for the same input; the dot's inline
  style is applied through the CSSOM exactly as React applies it.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
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

  const cm = $derived(getClassMap())
  // The dot's fill is the theme's colour for the state, never a hardcoded hex:
  // online/away/busy are the solid success/warning/error tones —
  // `cm.progressColor`, the solid tone fill the package's app-ui peer floor
  // (^1.0.1) already declares (`bgTone` is newer and would raise that floor) —
  // offline the theme's neutral border grey.
  const statusClass: Record<PresenceStatus, string> = $derived({
    online: cm.progressColor('success'),
    away: cm.progressColor('warning'),
    busy: cm.progressColor('error'),
    offline: cm.bgBorder,
  })
  const { t } = useTranslation()
  // One literal `t()` call per status value: a runtime-built key is invisible
  // to molecule's i18n gate. Every `presenceIndicator.status.*` key ships in
  // the `@molecule/app-locales-presence-indicator` bond.
  const statusWord = $derived.by(() => {
    switch (status) {
      case 'online':
        return t('presenceIndicator.status.online', undefined, { defaultValue: 'online' })
      case 'away':
        return t('presenceIndicator.status.away', undefined, { defaultValue: 'away' })
      case 'busy':
        return t('presenceIndicator.status.busy', undefined, { defaultValue: 'busy' })
      case 'offline':
        return t('presenceIndicator.status.offline', undefined, { defaultValue: 'offline' })
    }
  })
  const label = $derived(
    ariaLabel ??
      t(
        'presenceIndicator.aria.presence',
        { status: statusWord },
        {
          defaultValue: 'Presence: {{status}}',
        },
      ),
  )
  const style = $derived.by((): CSSStyle => {
    const styles: CSSStyle = {
      display: 'inline-block',
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
    }
    if (position === 'overlay') {
      styles.boxShadow = '0 0 0 2px var(--color-surface)'
      styles.position = 'absolute'
      if (corner.includes('top')) styles.top = '0px'
      if (corner.includes('bottom')) styles.bottom = '0px'
      if (corner.includes('right')) styles.right = '0px'
      if (corner.includes('left')) styles.left = '0px'
    }
    return styles
  })
</script>

<span
  role="status"
  aria-label={label}
  class={cm.cn(statusClass[status], className)}
  use:reactStyle={style}
></span>
