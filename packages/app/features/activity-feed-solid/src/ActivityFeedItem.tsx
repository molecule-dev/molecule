/**
 * Solid single activity row: avatar (or icon) + actor / verb / target ·
 * timestamp, plus an optional body.
 *
 * Solid counterpart of `@molecule/app-activity-feed-react`'s `ActivityFeedItem`
 * — the same props (React names), the same DOM for the same input.
 *
 * @module
 */

import { type Component, Show } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'
import { Avatar } from '@molecule/app-ui-solid'

import type { ActivityFeedItemProps } from './types.js'

/**
 * One entry in an activity feed.
 *
 * Shape: `[avatar|icon] [actor verb target · timestamp] [body]`. The leading
 * column renders the item's `icon` when supplied, otherwise an `<Avatar>` for
 * `avatarSrc`, otherwise nothing — React's `icon ?? (avatarSrc ? … : null)`.
 *
 * @param props - Component props (see {@link ActivityFeedItemProps}).
 * @returns The rendered activity row.
 */
export const ActivityFeedItem: Component<ActivityFeedItemProps> = (props) => {
  const cm = getClassMap()
  const hasIcon = (): boolean => props.item.icon != null

  return (
    <article class={cm.cn(cm.flex({ align: 'start', gap: 'sm' }), props.className)}>
      <div class={cm.shrink0}>
        <Show
          when={hasIcon()}
          fallback={
            <Show when={props.item.avatarSrc}>
              <Avatar src={props.item.avatarSrc} size="sm" />
            </Show>
          }
        >
          {props.item.icon}
        </Show>
      </div>
      <div class={cm.cn(cm.flex1, cm.stack(1 as const))}>
        <div class={cm.cn(cm.textSize('sm'))}>
          <span class={cm.fontWeight('semibold')}>{props.item.actor}</span> {props.item.verb}{' '}
          <Show when={props.item.target}>
            <span class={cm.fontWeight('medium')}>{props.item.target}</span>
          </Show>
          <span class={cm.cn(cm.sp('ml', 2), cm.textSize('xs'))}> · {props.item.timestamp}</span>
        </div>
        <Show when={props.item.body}>
          <div class={cm.textSize('sm')}>{props.item.body}</div>
        </Show>
      </div>
    </article>
  )
}
