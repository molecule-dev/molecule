/**
 * Scrollable message list for the chatbot sandbox. Each row is a
 * left-aligned (assistant) or right-aligned (user) bubble.
 *
 * @module
 */

import { type JSX, useEffect, useRef } from 'react'

import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Box } from '@molecule/app-ui-react/elements'

import type { TesterMessage } from './types.js'

/** Props for {@link ChatbotTesterMessages}. */
export interface ChatbotTesterMessagesProps {
  messages: TesterMessage[]
  loading?: boolean
  emptyState?: React.ReactNode
}

/** Scrollable transcript pane. */
export function ChatbotTesterMessages({
  messages,
  loading,
  emptyState: emptyStateProp,
}: ChatbotTesterMessagesProps): JSX.Element {
  const emptyState = slot(emptyStateProp)
  const cm = getClassMap()
  // A DOM element, not the neutral handle: scrolling into view is a web-only call (below).
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, loading])

  if (!loading && messages.length === 0 && emptyState) {
    return (
      <Box as="div" className={cm.cn(cm.flex1, cm.flex({ align: 'center', justify: 'center' }))}>
        {emptyState}
      </Box>
    )
  }
  return (
    <Box
      as="div"
      className={cm.cn(cm.flex1, cm.sp('px', 6), cm.sp('py', 4), cm.chatbotTesterMessageList)}
    >
      <Box as="div" className={cm.stack(3)}>
        {messages.map((msg) => {
          const isUser = msg.role === 'user'
          return (
            <Box
              as="div"
              key={msg.id}
              className={cm.cn(cm.flex({ justify: isUser ? 'end' : 'start' }))}
            >
              <Box
                as="div"
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  cm.chatbotTesterMessageBubble,
                  isUser ? cm.chatbotTesterMessageBubbleUser : cm.chatbotTesterMessageBubbleBot,
                )}
              >
                {msg.content}
                {msg.timestamp ? (
                  <Box
                    as="div"
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.sp('mt', 1),
                      isUser ? cm.chatbotTesterMessageTimeUser : cm.chatbotTesterMessageTimeBot,
                    )}
                  >
                    {msg.timestamp}
                  </Box>
                ) : null}
              </Box>
            </Box>
          )
        })}
        {loading ? (
          <Box as="div" className={cm.cn(cm.textSize('xs'), cm.chatbotTesterTypingIndicator)}>
            ...
          </Box>
        ) : null}
        <Box as="div" ref={endRef} />
      </Box>
    </Box>
  )
}

export default ChatbotTesterMessages
