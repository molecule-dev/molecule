/**
 * Solid scrollable message list for the chatbot sandbox: one left-aligned
 * (assistant) or right-aligned (user) bubble per message, with the typing
 * indicator appended while a reply is in flight.
 *
 * Solid counterpart of `@molecule/app-chatbot-tester-react`'s
 * `ChatbotTesterMessages` — the same props (React names) and the same DOM for
 * the same input.
 *
 * @module
 */

import { type Component, For, Show } from 'solid-js'

import { getClassMap } from '@molecule/app-ui'

import type { ChatbotTesterMessagesProps } from './types.js'

/**
 * Scrollable transcript pane. Renders the empty-state node instead of the list
 * when there are no messages, nothing is loading and an empty state was given
 * (React's branch).
 *
 * @param props - Component props (see {@link ChatbotTesterMessagesProps}).
 * @returns The rendered transcript pane.
 */
export const ChatbotTesterMessages: Component<ChatbotTesterMessagesProps> = (props) => {
  const cm = getClassMap()

  /**
   * Whether React takes the empty-state branch.
   *
   * @returns True when the empty state renders instead of the list.
   */
  const showsEmptyState = (): boolean =>
    !props.loading && props.messages.length === 0 && Boolean(props.emptyState)

  return (
    <Show
      when={showsEmptyState()}
      fallback={
        <div class={cm.cn(cm.flex1, cm.sp('px', 6), cm.sp('py', 4), cm.chatbotTesterMessageList)}>
          <div class={cm.stack(3)}>
            <For each={props.messages}>
              {(msg) => {
                const isUser = (): boolean => msg.role === 'user'
                return (
                  <div class={cm.cn(cm.flex({ justify: isUser() ? 'end' : 'start' }))}>
                    <div
                      class={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        cm.textSize('sm'),
                        cm.chatbotTesterMessageBubble,
                        isUser()
                          ? cm.chatbotTesterMessageBubbleUser
                          : cm.chatbotTesterMessageBubbleBot,
                      )}
                    >
                      {msg.content}
                      <Show when={msg.timestamp}>
                        <div
                          class={cm.cn(
                            cm.textSize('xs'),
                            cm.sp('mt', 1),
                            isUser()
                              ? cm.chatbotTesterMessageTimeUser
                              : cm.chatbotTesterMessageTimeBot,
                          )}
                        >
                          {msg.timestamp}
                        </div>
                      </Show>
                    </div>
                  </div>
                )
              }}
            </For>
            <Show when={props.loading}>
              <div class={cm.cn(cm.textSize('xs'), cm.chatbotTesterTypingIndicator)}>...</div>
            </Show>
            <div />
          </div>
        </div>
      }
    >
      <div class={cm.cn(cm.flex1, cm.flex({ align: 'center', justify: 'center' }))}>
        {props.emptyState}
      </div>
    </Show>
  )
}
