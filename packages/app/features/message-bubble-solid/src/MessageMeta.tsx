import type { Component, JSX } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { MessageMetaProps } from './types.js'

/**
 * Small `[author · timestamp]` row rendered above a message body. Broken
 * out so apps can reuse it in notification rows, quote blocks, etc.
 *
 * This is the Solid counterpart of `@molecule/app-message-bubble-react`'s
 * `MessageMeta`: the same props (React names) and the same DOM for the same
 * input.
 *
 * @param props - Component props (see {@link MessageMetaProps}).
 * @returns The rendered message meta row.
 */
export const MessageMeta: Component<MessageMetaProps> = (props): JSX.Element => {
  const cm = getClassMap()
  return (
    <div
      class={cm.cn(cm.flex({ align: 'baseline', gap: 'sm' }), cm.textSize('xs'), props.className)}
    >
      <span class={cm.fontWeight('semibold')}>{props.author}</span>
      <span>{props.timestamp}</span>
    </div>
  )
}
