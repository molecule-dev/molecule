/**
 * Composed sandbox UI: optional bot picker + messages thread + input
 * row + error region.
 *
 * Stateless about transport: the consumer owns the message array, the
 * send handler, and (optionally) the bot list + current bot id. Pass
 * the side-effects (creating a test conversation, sending messages
 * upstream, etc.) as `onSend` / `onBotChange`.
 *
 * @module
 */

import { type JSX, type ReactNode, useState } from 'react'

import { getClassMap } from '@molecule/app-ui'

import { ChatbotTesterInput } from './ChatbotTesterInput.js'
import { ChatbotTesterMessages } from './ChatbotTesterMessages.js'
import type { TesterBotOption, TesterMessage } from './types.js'

interface ChatbotTesterProps {
  messages: TesterMessage[]
  loading?: boolean
  /** When provided, send invokes this with the composer text. */
  onSend: (text: string) => void | Promise<void>
  /** Optional bot list — when length >= 2, a picker is rendered. */
  bots?: TesterBotOption[]
  botId?: string
  onBotChange?: (id: string) => void
  /** Last error message — rendered in a `role="alert"` paragraph. */
  error?: ReactNode
  /** Empty-state slot when there are no messages yet. */
  emptyState?: ReactNode
  botPickerLabel?: ReactNode
  inputPlaceholder?: string
  sendLabel?: string
  className?: string
}

/** Full chatbot tester sandbox. */
export function ChatbotTester({
  messages,
  loading,
  onSend,
  bots,
  botId,
  onBotChange,
  error,
  emptyState,
  botPickerLabel = 'Test bot',
  inputPlaceholder,
  sendLabel,
  className,
}: ChatbotTesterProps): JSX.Element {
  const cm = getClassMap()
  const [input, setInput] = useState('')
  const handleSend = async (): Promise<void> => {
    const text = input.trim()
    if (!text) return
    setInput('')
    await onSend(text)
  }

  return (
    <div className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, 'min-w-0', className)}>
      {bots && bots.length > 1 ? (
        <div
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 6),
            cm.sp('py', 3),
            'gap-3 border-b border-outline-variant/20',
          )}
        >
          <label
            htmlFor="chatbot-tester-bot-select"
            className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'))}
          >
            {botPickerLabel}
          </label>
          <select
            id="chatbot-tester-bot-select"
            value={botId ?? ''}
            onChange={(e) => onBotChange?.(e.target.value)}
            className={cm.cn(
              cm.textSize('sm'),
              'bg-surface-container-high border-none rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary/40',
            )}
          >
            {bots.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name || b.id}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <ChatbotTesterMessages messages={messages} loading={loading} emptyState={emptyState} />
      {error ? (
        <p
          role="alert"
          className={cm.cn(cm.textSize('sm'), cm.sp('px', 6), cm.sp('py', 2), 'text-error')}
        >
          {error}
        </p>
      ) : null}
      <ChatbotTesterInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        loading={loading}
        placeholder={inputPlaceholder}
        sendLabel={sendLabel}
      />
    </div>
  )
}

export default ChatbotTester
