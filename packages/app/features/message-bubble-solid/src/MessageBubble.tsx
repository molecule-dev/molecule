import type { Component, JSX } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'
import { Avatar } from '@molecule/app-ui-solid'

import { MessageMeta } from './MessageMeta.jsx'
import type { MessageBubbleProps } from './types.js'

/**
 * One message in a chat thread — avatar, author/timestamp row, body, plus
 * optional attachments/reactions/thread indicator passed in via
 * `message.attachments` / `message.reactions` / `message.thread`.
 *
 * `isSelf` flips the row direction so the viewer's own messages appear on
 * the right — no bubble background/tint is applied; style the body via
 * `className` if you want classic chat bubbles.
 *
 * This is the Solid counterpart of `@molecule/app-message-bubble-react`: the
 * same props (React names), the same ClassMap tokens, and the same DOM for the
 * same input.
 *
 * @param props - Component props (see {@link MessageBubbleProps}).
 * @returns The rendered message bubble.
 */
export const MessageBubble: Component<MessageBubbleProps> = (props): JSX.Element => {
  const cm = getClassMap()
  const showMeta = (): boolean => props.showMeta ?? true
  return (
    <article
      class={cm.cn(
        cm.flex({
          align: 'start',
          gap: 'sm',
          direction: props.isSelf ? 'row-reverse' : 'row',
        }),
        props.className,
      )}
    >
      <div class={cm.shrink0}>
        <Avatar
          src={props.message.author.avatarSrc}
          alt={props.message.author.name}
          name={props.message.author.name}
          size="sm"
        />
      </div>
      <div class={cm.cn(cm.flex1, cm.stack(1))}>
        {showMeta() ? (
          <MessageMeta author={props.message.author.name} timestamp={props.message.timestamp} />
        ) : null}
        <div class={cm.cn(cm.sp('p', 3))}>{props.message.body}</div>
        {props.message.attachments ? (
          <div class={cm.sp('mt', 1)}>{props.message.attachments}</div>
        ) : null}
        {props.message.reactions ? (
          <div class={cm.sp('mt', 1)}>{props.message.reactions}</div>
        ) : null}
        {props.message.thread ? <div class={cm.sp('mt', 1)}>{props.message.thread}</div> : null}
      </div>
    </article>
  )
}
