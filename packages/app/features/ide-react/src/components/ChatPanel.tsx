/**
 * AI chat panel with streaming support and tool call display.
 *
 * @module
 */

import type { JSX } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { t } from '@molecule/app-i18n'
import { useChat } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import type { ChatPanelProps } from '../types.js'
import { ToolCallCard } from './ToolCallCard.js'

/**
 * AI chat panel with streaming message display and tool call cards.
 * @param root0 - The component props.
 * @param root0.projectId - The project ID for the chat session.
 * @param root0.endpoint - Optional custom chat API endpoint URL.
 * @param root0.className - Optional CSS class name for the container.
 * @returns The rendered chat panel element.
 */
export function ChatPanel({ projectId, endpoint, className }: ChatPanelProps): JSX.Element {
  const cm = getClassMap()
  const chatEndpoint = endpoint || `/projects/${projectId}/chat`
  const { messages, isLoading, error, sendMessage, abort } = useChat({
    endpoint: chatEndpoint,
    projectId,
  })
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const trimmed = inputValue.trim()
      if (!trimmed || isLoading) return
      setInputValue('')
      sendMessage(trimmed)
    },
    [inputValue, isLoading, sendMessage],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit(e)
      }
    },
    [handleSubmit],
  )

  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), cm.h('full'), cm.surface, className)}>
      {/* Header */}
      <div
        className={cm.cn(
          cm.flex({ direction: 'row', align: 'center', justify: 'between' }),
          cm.sp('px', 3),
          cm.sp('py', 2),
          cm.shrink0,
          cm.fontWeight('medium'),
          cm.textSize('sm'),
          cm.borderB,
        )}
      >
        <span>{t('ide.chat.title')}</span>
      </div>

      {/* Messages */}
      <div className={cm.cn(cm.sp('p', 3))} style={{ flex: 1, overflowY: 'auto' }}>
        {messages.length === 0 && (
          <div className={cm.cn(cm.textMuted, cm.textSize('sm'), cm.textCenter)}>
            {t('ide.chat.emptyState')}
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={cm.sp('mb', 3)}>
            <div
              className={cm.cn(
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                cm.sp('mb', 1),
                msg.role === 'user' ? cm.textPrimary : cm.textSuccess,
              )}
            >
              {msg.role === 'user' ? t('ide.chat.you') : t('ide.chat.molecule')}
            </div>
            <div className={cm.cn(cm.textSize('sm'))} style={{ whiteSpace: 'pre-wrap' }}>
              {msg.content}
              {msg.isStreaming && (
                <span style={{ animation: 'pulse 1.5s infinite' }}>{'\u2588'}</span>
              )}
            </div>
            {msg.toolCalls && msg.toolCalls.length > 0 && (
              <div className={cm.sp('mt', 2)}>
                {msg.toolCalls.map((tc) => (
                  <ToolCallCard
                    key={tc.id}
                    id={tc.id}
                    name={tc.name}
                    input={tc.input}
                    output={tc.output}
                    status={tc.status}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {error && (
          <div
            className={cm.cn(
              cm.textSize('sm'),
              cm.sp('p', 2),
              cm.sp('mb', 2),
              cm.bgErrorSubtle,
              cm.textError,
            )}
            style={{ borderRadius: '6px' }}
          >
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className={cm.cn(cm.sp('p', 3), cm.shrink0, cm.borderT)}>
        <div className={cm.flex({ direction: 'row', align: 'end', gap: 'sm' })}>
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('ide.chat.placeholder')}
            rows={1}
            className={cm.cn(cm.textSize('sm'), cm.sp('p', 2), cm.surfaceSecondary, cm.borderAll)}
            style={{
              flex: 1,
              borderRadius: '6px',
              color: 'inherit',
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          {isLoading ? (
            <button type="button" onClick={abort} className={cm.button({ color: 'error' })}>
              {t('ide.chat.stop')}
            </button>
          ) : (
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className={cm.button({ color: 'primary' })}
            >
              {t('ide.chat.send')}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

ChatPanel.displayName = 'ChatPanel'
