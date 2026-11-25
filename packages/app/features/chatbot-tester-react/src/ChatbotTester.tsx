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

import { useTranslation } from '@molecule/app-react'
import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Box, SelectField, Text } from '@molecule/app-ui-react/elements'

import { ChatbotTesterInput } from './ChatbotTesterInput.js'
import { ChatbotTesterMessages } from './ChatbotTesterMessages.js'
import type { TesterBotOption, TesterMessage } from './types.js'

/** Props for {@link ChatbotTester}. */
export interface ChatbotTesterProps {
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
  /** Bot picker's label — an explicit node overrides `t('chatbotTester.label.testBot')`. */
  botPickerLabel?: ReactNode
  /** Composer placeholder — an explicit value overrides `t('chatbotTester.placeholder.message')`. */
  inputPlaceholder?: string
  /** Send button label — an explicit value overrides `t('chatbotTester.label.send')`. */
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
  error: errorProp,
  emptyState,
  botPickerLabel: botPickerLabelProp,
  inputPlaceholder,
  sendLabel,
  className,
}: ChatbotTesterProps): JSX.Element {
  const error = slot(errorProp)
  const botPickerLabel = slot(botPickerLabelProp)
  const cm = getClassMap()
  const { t } = useTranslation()
  const pickerLabel =
    botPickerLabel === undefined
      ? t('chatbotTester.label.testBot', undefined, { defaultValue: 'Test bot' })
      : botPickerLabel
  const [input, setInput] = useState('')
  const handleSend = async (): Promise<void> => {
    const text = input.trim()
    if (!text) return
    setInput('')
    await onSend(text)
  }

  return (
    <Box as="div" className={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, cm.minW(0), className)}>
      {bots && bots.length > 1 ? (
        <Box
          as="div"
          className={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.chatbotTesterBotBar,
          )}
        >
          <Text
            as="label"
            htmlFor="chatbot-tester-bot-select"
            className={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'))}
          >
            {pickerLabel}
          </Text>
          <SelectField
            as="select"
            id="chatbot-tester-bot-select"
            value={botId ?? ''}
            onValueChange={(id) => onBotChange?.(id)}
            className={cm.cn(cm.textSize('sm'), cm.chatbotTesterBotSelect)}
            options={bots.map((b) => ({ value: b.id, label: b.name || b.id }))}
          />
        </Box>
      ) : null}
      <ChatbotTesterMessages messages={messages} loading={loading} emptyState={emptyState} />
      {error ? (
        <Text
          as="p"
          role="alert"
          className={cm.cn(cm.textSize('sm'), cm.sp('px', 6), cm.sp('py', 2), cm.textError)}
        >
          {error}
        </Text>
      ) : null}
      <ChatbotTesterInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        loading={loading}
        placeholder={inputPlaceholder}
        sendLabel={sendLabel}
      />
    </Box>
  )
}

export default ChatbotTester
