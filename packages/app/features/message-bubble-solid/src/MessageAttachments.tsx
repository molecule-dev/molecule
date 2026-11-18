import { type Component, For, type JSX } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { MessageAttachmentsProps } from './types.js'

/**
 * Vertical list of attachment rows below a message body.
 * Each row: `[icon] [name · size] [action]`.
 *
 * This is the Solid counterpart of `@molecule/app-message-bubble-react`'s
 * `MessageAttachments`: the same props (React names) and the same DOM for the
 * same input.
 *
 * @param props - Component props (see {@link MessageAttachmentsProps}).
 * @returns The rendered attachment list.
 */
export const MessageAttachments: Component<MessageAttachmentsProps> = (props): JSX.Element => {
  const cm = getClassMap()
  return (
    <div class={cm.cn(cm.stack(1), props.className)}>
      <For each={props.attachments}>
        {(attachment) => (
          <div class={cm.flex({ align: 'center', gap: 'sm' })}>
            {attachment.icon}
            <span class={cm.cn(cm.flex1, cm.textSize('sm'))}>
              <span class={cm.fontWeight('medium')}>{attachment.name}</span>
              {attachment.size ? <span class={cm.sp('ml', 2)}>{attachment.size}</span> : null}
            </span>
            {attachment.action}
          </div>
        )}
      </For>
    </div>
  )
}
