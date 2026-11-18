/**
 * Composer input row with send button. Enter sends; shift+enter inserts
 * a newline. Disables the send action while a reply is in flight.
 *
 * @module
 */

import type { JSX } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

/** Props for {@link ChatbotTesterInput}. */
export interface ChatbotTesterInputProps {
  value: string
  onChange: (next: string) => void
  onSend: () => void
  loading?: boolean
  /** Composer placeholder — an explicit value overrides `t('chatbotTester.placeholder.message')`. */
  placeholder?: string
  /** Send button label — an explicit value overrides `t('chatbotTester.label.send')`. */
  sendLabel?: string
}

/** Message composer + send button. */
export function ChatbotTesterInput({
  value,
  onChange,
  onSend,
  loading,
  placeholder,
  sendLabel,
}: ChatbotTesterInputProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const placeholderText =
    placeholder === undefined
      ? t('chatbotTester.placeholder.message', undefined, { defaultValue: 'Type a message…' })
      : placeholder
  const sendText =
    sendLabel === undefined
      ? t('chatbotTester.label.send', undefined, { defaultValue: 'Send' })
      : sendLabel
  return (
    <div
      className={cm.cn(
        cm.flex({ align: 'end', gap: 2 }),
        cm.sp('px', 6),
        cm.sp('py', 4),
        cm.chatbotTesterInputRow,
      )}
    >
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onSend()
          }
        }}
        rows={1}
        placeholder={placeholderText}
        disabled={loading}
        className={cm.cn(
          cm.flex1,
          cm.sp('px', 4),
          cm.sp('py', 2),
          cm.textSize('sm'),
          cm.surface,
          cm.chatbotTesterInputField,
        )}
      />
      <button
        type="button"
        data-mol-id="chatbot-tester-send"
        onClick={onSend}
        disabled={loading || !value.trim()}
        className={cm.cn(
          cm.button({ variant: 'solid', color: 'primary', size: 'sm' }),
          cm.touchTargetCompact,
        )}
      >
        {sendText}
      </button>
    </div>
  )
}

export default ChatbotTesterInput
