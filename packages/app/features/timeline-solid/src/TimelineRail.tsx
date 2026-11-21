import { type Component, Show } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { TimelineRailProps } from './types.js'

/**
 * Left-hand rail of a timeline row — renders the marker and an optional
 * vertical connector extending downward.
 *
 * This is the Solid counterpart of `@molecule/app-timeline-react`'s
 * `TimelineRail`: the same props (React names), the same ClassMap tokens, and
 * the same DOM for the same input (including the connector's inline style).
 *
 * @param props - Component props (see {@link TimelineRailProps}).
 * @returns The rendered rail.
 */
export const TimelineRail: Component<TimelineRailProps> = (props) => {
  const cm = getClassMap()
  const connector = (): boolean => props.connector ?? true
  /**
   * The connector's inline style, exactly React's object. A fresh object per
   * call, so Solid applies it through the CSSOM property setter like React and
   * the serialized attribute matches (a static object literal is written as
   * the attribute's text instead, keeping `currentColor`).
   *
   * @returns The style declarations.
   */
  const connectorStyle = (): Record<string, string> => ({
    'border-left': '1px solid currentColor',
    opacity: '0.2',
    'min-height': '24px',
  })
  return (
    <div class={cm.cn(cm.flex({ direction: 'col', align: 'center' }), cm.shrink0, props.className)}>
      <div>{props.marker ?? <span aria-hidden="true">•</span>}</div>
      <Show when={connector()}>
        <div class={cm.cn(cm.w(0 as const), cm.h('full'))} style={connectorStyle()} />
      </Show>
    </div>
  )
}
