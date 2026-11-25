import type React from 'react'

import { useTranslation } from '@molecule/app-react'
import { type CSSProperties, getClassMap } from '@molecule/app-ui'
import { Box } from '@molecule/app-ui-react/elements'

/** Union of supported user-presence states displayed by the dot. */
export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline'

/** Props for {@link PresenceDot}. */
export interface PresenceDotProps {
  status: PresenceStatus
  /** Diameter in pixels. Defaults to 10. */
  size?: number
  /** Position — `'inline'` default; `'overlay'` positions absolutely for avatar overlays. */
  position?: 'inline' | 'overlay'
  /** Overlay corner when `position="overlay"`. */
  corner?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left'
  /** Accessible label override; defaults to `t('presenceIndicator.aria.presence', …)`. */
  ariaLabel?: string
  /** Extra classes. */
  className?: string
}

/** The translation function `useTranslation()` hands this component. */
type Translate = ReturnType<typeof useTranslation>['t']

/**
 * The translated word for one presence state: one literal `t()` call per value
 * of {@link PresenceStatus}, so molecule's i18n gate sees each key exist (a
 * runtime-built key such as `` t(`presenceIndicator.status.${status}`) `` is
 * invisible to it). Every `presenceIndicator.status.*` key ships in the
 * `@molecule/app-locales-presence-indicator` bond.
 *
 * @param status - The presence state to name.
 * @param t - The translation function from `useTranslation()`.
 * @returns The status's word in the active locale (e.g. `'online'` in English).
 */
function statusLabel(status: PresenceStatus, t: Translate): string {
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
}

/**
 * Small colored circle indicating user presence. Use inline next to a
 * name, or with `position="overlay"` attached to the corner of an
 * `<Avatar>`. The default label resolves through `t()` with the
 * `presenceIndicator.aria.presence` key (an explicitly translated status
 * word per `presenceIndicator.status.*` key), so it follows the active
 * locale; `ariaLabel` overrides it.
 * @param props - Component props (see {@link PresenceDotProps}).
 */
export function PresenceDot({
  status,
  size = 10,
  position = 'inline',
  corner = 'bottom-right',
  ariaLabel,
  className,
}: PresenceDotProps): React.JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  // The dot's fill is the theme's colour for the state, never a hardcoded hex:
  // online/away/busy are the solid success/warning/error tones —
  // `cm.progressColor`, the solid tone fill the package's app-ui peer floor
  // (^1.0.1) already declares (`bgTone` is newer and would raise that floor) —
  // offline the theme's neutral border grey.
  const statusClass: Record<PresenceStatus, string> = {
    online: cm.progressColor('success'),
    away: cm.progressColor('warning'),
    busy: cm.progressColor('error'),
    offline: cm.bgBorder,
  }
  const style: CSSProperties = {
    display: 'inline-block',
    width: size,
    height: size,
    borderRadius: '50%',
    boxShadow: position === 'overlay' ? '0 0 0 2px var(--color-surface)' : undefined,
  }
  if (position === 'overlay') {
    style.position = 'absolute'
    if (corner.includes('top')) style.top = 0
    if (corner.includes('bottom')) style.bottom = 0
    if (corner.includes('right')) style.right = 0
    if (corner.includes('left')) style.left = 0
  }
  return (
    <Box
      as="span"
      role="status"
      aria-label={
        ariaLabel ??
        t(
          'presenceIndicator.aria.presence',
          { status: statusLabel(status, t) },
          {
            defaultValue: 'Presence: {{status}}',
          },
        )
      }
      className={cm.cn(statusClass[status], className)}
      webStyle={style}
    />
  )
}
