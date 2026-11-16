/**
 * Solid notification wrapper: positions a `<NotificationBadge>` at a corner
 * of any child element.
 *
 * Solid counterpart of `@molecule/app-notification-badge-react`'s
 * `NotificationWrapper` — the same props (React names), the same DOM for the
 * same input.
 *
 * @module
 */

import type { Component, JSX } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import { NotificationBadge } from './NotificationBadge.jsx'
import type { NotificationWrapperProps } from './types.js'

/**
 * Positions a `<NotificationBadge>` at a corner of any child element.
 * The wrapper becomes `relative` so the badge absolutely positions
 * correctly — wrap icon buttons, avatars, or nav entries.
 *
 * @param props - Component props (see {@link NotificationWrapperProps}).
 * @returns The rendered wrapper.
 */
export const NotificationWrapper: Component<NotificationWrapperProps> = (props) => {
  const cm = getClassMap()
  const placement = (): NonNullable<NotificationWrapperProps['placement']> =>
    props.placement ?? 'top-right'
  const style = (): JSX.CSSProperties => {
    const box: JSX.CSSProperties = { position: 'absolute' }
    if (placement().includes('top')) box.top = '-4px'
    if (placement().includes('bottom')) box.bottom = '-4px'
    if (placement().includes('right')) box.right = '-4px'
    if (placement().includes('left')) box.left = '-4px'
    return box
  }

  return (
    <span
      class={cm.cn(cm.position('relative'), props.className)}
      style={{ display: 'inline-block' }}
    >
      {props.children}
      <span style={style()}>
        <NotificationBadge
          count={props.count}
          hideOnZero={props.hideOnZero ?? true}
          variant={props.variant ?? 'error'}
        />
      </span>
    </span>
  )
}
