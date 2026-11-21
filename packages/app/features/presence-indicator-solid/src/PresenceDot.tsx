/**
 * Solid presence dot: a small colored status circle.
 *
 * Solid counterpart of `@molecule/app-presence-indicator-react`'s
 * `PresenceDot` — the same props (React names), the same DOM for the same
 * input.
 *
 * @module
 */

import type { Component, JSX } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { PresenceDotProps, PresenceStatus } from './types.js'

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
function statusLabel(status: PresenceStatus, t: ReturnType<typeof useTranslation>['t']): string {
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
 * Small colored circle indicating user presence. Use inline next to a name,
 * or with `position="overlay"` attached to the corner of an avatar.
 *
 * The default aria-label resolves through `t()` with the
 * `presenceIndicator.aria.presence` key (an explicitly translated status word
 * per `presenceIndicator.status.*` key), so it follows the active locale;
 * `ariaLabel` overrides it.
 *
 * @param props - Component props (see {@link PresenceDotProps}).
 * @returns The rendered presence dot.
 */
export const PresenceDot: Component<PresenceDotProps> = (props) => {
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
  const size = (): number => props.size ?? 10
  const position = (): 'inline' | 'overlay' => props.position ?? 'inline'
  const corner = (): string => props.corner ?? 'bottom-right'
  const style = (): JSX.CSSProperties => {
    const styles: JSX.CSSProperties = {
      display: 'inline-block',
      width: `${size()}px`,
      height: `${size()}px`,
      'border-radius': '50%',
    }
    if (position() === 'overlay') {
      styles['box-shadow'] = '0 0 0 2px var(--color-surface)'
      styles.position = 'absolute'
      if (corner().includes('top')) styles.top = '0px'
      if (corner().includes('bottom')) styles.bottom = '0px'
      if (corner().includes('right')) styles.right = '0px'
      if (corner().includes('left')) styles.left = '0px'
    }
    return styles
  }
  return (
    <span
      role="status"
      aria-label={
        props.ariaLabel ??
        t(
          'presenceIndicator.aria.presence',
          { status: statusLabel(props.status, t) },
          {
            defaultValue: 'Presence: {{status}}',
          },
        )
      }
      class={cm.cn(statusClass[props.status], props.className)}
      style={style()}
    />
  )
}
