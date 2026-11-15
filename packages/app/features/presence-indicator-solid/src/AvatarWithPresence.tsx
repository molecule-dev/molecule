/**
 * Solid avatar with a presence overlay.
 *
 * Solid counterpart of `@molecule/app-presence-indicator-react`'s
 * `AvatarWithPresence` — the same props (React names), the same DOM for the
 * same input.
 *
 * @module
 */

import type { Component } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import { PresenceDot } from './PresenceDot.jsx'
import type { AvatarWithPresenceProps } from './types.js'

/**
 * Wraps any avatar/image and overlays a presence dot at a corner.
 * Non-destructive — just positions the dot; the child is untouched.
 *
 * @param props - Component props (see {@link AvatarWithPresenceProps}).
 * @returns The rendered avatar with its presence overlay.
 */
export const AvatarWithPresence: Component<AvatarWithPresenceProps> = (props) => {
  const cm = getClassMap()
  return (
    <span
      class={cm.cn(cm.position('relative'), props.className)}
      style={{ display: 'inline-block' }}
    >
      {props.children}
      {props.status && (
        <PresenceDot
          status={props.status}
          position="overlay"
          corner={props.corner ?? 'bottom-right'}
          size={props.dotSize}
        />
      )}
    </span>
  )
}
