/**
 * Solid semantic status badge: maps status kinds to ClassMap color variants,
 * with a framework `<Badge>` (`appearance='ui'`, default) or a compact
 * uppercase pill appearance.
 *
 * @module
 */

import type { Component } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'
import { Badge } from '@molecule/app-ui-solid'

import type { StatusBadgeProps, StatusKind } from './types.js'

const KIND_TO_COLOR: Record<StatusKind, 'success' | 'warning' | 'error' | 'info' | 'secondary'> = {
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'info',
  neutral: 'secondary',
}

/**
 * Semantic status badge — maps status kinds to ClassMap color variants.
 *
 * Both appearances resolve their color through the ClassMap `badge` tokens,
 * so they stay theme-correct: `appearance="ui"` (default) renders the
 * framework `<Badge>`, and `'uppercase-pill'` renders a compact uppercase pill
 * with the same per-kind `bg-*` / `text-*` colors.
 *
 * @param props - Component props (see {@link StatusBadgeProps}).
 * @returns The rendered status badge.
 */
export const StatusBadge: Component<StatusBadgeProps> = (props) => {
  const cm = getClassMap()
  const kind = (): StatusKind => props.kind ?? 'neutral'
  const color = (): (typeof KIND_TO_COLOR)[StatusKind] => KIND_TO_COLOR[kind()]

  return (
    <>
      {props.appearance === 'uppercase-pill' ? (
        <span
          class={cm.cn(
            cm.badge({ variant: color() }),
            cm.uppercase,
            cm.trackingWide,
            props.className,
          )}
        >
          {props.icon && <span class={cm.sp('mr', 1)}>{props.icon}</span>}
          {props.children}
        </span>
      ) : (
        <Badge color={color()} className={props.className}>
          {props.icon && <span class={cm.sp('mr', 1)}>{props.icon}</span>}
          {props.children}
        </Badge>
      )}
    </>
  )
}
