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

import { getClassMap } from '@molecule/app-ui'

import type { PresenceDotProps, PresenceStatus } from './types.js'

/** The fixed semantic hue of each presence state. */
const STATUS_COLOR: Record<PresenceStatus, string> = {
  online: '#22c55e',
  away: '#eab308',
  busy: '#ef4444',
  offline: '#94a3b8',
}

/**
 * Small colored circle indicating user presence. Use inline next to a name,
 * or with `position="overlay"` attached to the corner of an avatar.
 *
 * The default aria-label is the English string `Presence: <status>` — pass
 * `ariaLabel` (e.g. from `t()`) in localized apps.
 *
 * @param props - Component props (see {@link PresenceDotProps}).
 * @returns The rendered presence dot.
 */
export const PresenceDot: Component<PresenceDotProps> = (props) => {
  const cm = getClassMap()
  const size = (): number => props.size ?? 10
  const position = (): 'inline' | 'overlay' => props.position ?? 'inline'
  const corner = (): string => props.corner ?? 'bottom-right'
  const style = (): JSX.CSSProperties => {
    const styles: JSX.CSSProperties = {
      display: 'inline-block',
      width: `${size()}px`,
      height: `${size()}px`,
      'border-radius': '50%',
      background: STATUS_COLOR[props.status],
    }
    if (position() === 'overlay') {
      styles['box-shadow'] = '0 0 0 2px var(--color-surface, #fff)'
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
      aria-label={props.ariaLabel ?? `Presence: ${props.status}`}
      class={cm.cn(props.className)}
      style={style()}
    />
  )
}
