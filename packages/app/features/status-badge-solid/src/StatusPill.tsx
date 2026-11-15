/**
 * Solid status pill: a rounded pill with an optional leading colored dot.
 *
 * @module
 */

import type { Component } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { StatusKind, StatusPillProps } from './types.js'

const DOT_COLOR: Record<StatusKind, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
  info: 'bg-info',
  neutral: 'bg-outline',
}

/**
 * Rounded status pill with an optional leading colored dot. The pill has NO
 * background surface of its own — only the dot carries color — so add a
 * surface via `className` if you need a filled pill.
 *
 * @param props - Component props (see {@link StatusPillProps}).
 * @returns The rendered status pill.
 */
export const StatusPill: Component<StatusPillProps> = (props) => {
  const cm = getClassMap()

  return (
    <span
      class={cm.cn(
        cm.flex({ align: 'center', gap: 'xs' }),
        cm.sp('px', 3),
        cm.sp('py', 1),
        cm.roundedFull,
        cm.textSize('xs'),
        cm.fontWeight('medium'),
        props.className,
      )}
    >
      {(props.dot ?? true) && (
        <span
          class={cm.cn(cm.w(2), cm.h(2), cm.roundedFull, DOT_COLOR[props.kind ?? 'neutral'])}
          aria-hidden="true"
        />
      )}
      {props.children}
    </span>
  )
}
