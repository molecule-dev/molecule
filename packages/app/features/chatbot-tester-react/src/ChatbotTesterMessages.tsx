/**
 * Scrollable message list for the chatbot sandbox. Each row is a
 * left-aligned (assistant) or right-aligned (user) bubble.
 *
 * @module
 */

import { getClassMap } from '@molecule/app-ui'
import { useEffect, useRef } from 'react'

import type { TesterMessage } from './types.js'

interface ChatbotTesterMessagesProps {
  messages: TesterMessage[]
  loading?: boolean
  emptyState?: React.ReactNode
}

/** Scrollable transcript pane. */
export function ChatbotTesterMessages({
  messages,
  loading,
  emptyState,
}: ChatbotTesterMessagesProps) {
  const cm = getClassMap()
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, loading])

  if (!loading && messages.length === 0 && emptyState) {
    return (
      <div className={cm.cn(cm.flex1, cm.flex({ align: 'center', justify: 'center' }))}>
        {emptyState}
      </div>
    )
  }
  return (
    <div className={cm.cn(cm.flex1, cm.sp('px', 6), cm.sp('py', 4), 'overflow-y-auto')}>
      <div className={cm.stack(3)}>
        {messages.map((msg) => {
          const isUser = msg.role === 'user'
          return (
            <div key={msg.id} className={cm.cn(cm.flex({ justify: isUser ? 'end' : 'start' }))}>
              <div
                className={cm.cn(
                  cm.sp('px', 4),
                  cm.sp('py', 2),
                  cm.textSize('sm'),
                  'rounded-2xl max-w-[80%] whitespace-pre-wrap',
                  isUser
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-high text-on-surface',
                )}
              >
                {msg.content}
                {msg.timestamp ? (
                  <div
                    className={cm.cn(
                      cm.textSize('xs'),
                      cm.sp('mt', 1),
                      isUser ? 'text-on-primary/70' : 'text-on-surface-variant',
                    )}
                  >
                    {msg.timestamp}
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
        {loading ? (
          <div className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant animate-pulse')}>
            ...
          </div>
        ) : null}
        <div ref={endRef} />
      </div>
    </div>
  )
}

export default ChatbotTesterMessages
