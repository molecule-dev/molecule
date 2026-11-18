/**
 * Types for the Solid chatbot-tester sandbox UI — the same props (React names)
 * as `@molecule/app-chatbot-tester-react`.
 *
 * @module
 */

import type { JSX } from 'solid-js'

/** A single chat message displayed in the chatbot tester sandbox UI. */
export interface TesterMessage {
  id: string | number
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
}

/** A selectable bot/agent option shown in the chatbot tester sandbox UI. */
export interface TesterBotOption {
  id: string
  name?: string
}

/** Props accepted by the {@link ChatbotTester} component. */
export interface ChatbotTesterProps {
  /** The transcript, in display order. */
  messages: TesterMessage[]
  /** A reply is in flight: the composer and its send action are disabled. */
  loading?: boolean
  /** Called with the trimmed composer text when the user sends. */
  onSend: (text: string) => void | Promise<void>
  /** Optional bot list — when length >= 2, a picker is rendered. */
  bots?: TesterBotOption[]
  /** The selected bot id (controlled). */
  botId?: string
  /** Called with the newly selected bot id. */
  onBotChange?: (id: string) => void
  /** Last error message — rendered in a `role="alert"` paragraph. */
  error?: JSX.Element
  /** Empty-state slot when there are no messages yet. */
  emptyState?: JSX.Element
  /** The bot picker's label — an explicit value overrides `t('chatbotTester.label.testBot')` (`'Test bot'`). */
  botPickerLabel?: JSX.Element
  /** Composer placeholder — an explicit value overrides `t('chatbotTester.placeholder.message')` (`'Type a message…'`). */
  inputPlaceholder?: string
  /** Send button label — an explicit value overrides `t('chatbotTester.label.send')` (`'Send'`). */
  sendLabel?: string
  /** Extra classes on the outer wrapper. */
  className?: string
}

/** Props accepted by the {@link ChatbotTesterInput} component. */
export interface ChatbotTesterInputProps {
  /** The composer's current text (controlled). */
  value: string
  /** Called with the field's new text on every edit. */
  onChange: (next: string) => void
  /** Called when the user presses Enter (without Shift) or clicks send. */
  onSend: () => void
  /** A reply is in flight: the field and the send button are disabled. */
  loading?: boolean
  /** Placeholder text — an explicit value overrides `t('chatbotTester.placeholder.message')` (`'Type a message…'`). */
  placeholder?: string
  /** Send button label — an explicit value overrides `t('chatbotTester.label.send')` (`'Send'`). */
  sendLabel?: string
}

/** Props accepted by the {@link ChatbotTesterMessages} component. */
export interface ChatbotTesterMessagesProps {
  /** The transcript, in display order. */
  messages: TesterMessage[]
  /** A reply is in flight: the typing indicator is appended. */
  loading?: boolean
  /** Rendered instead of the transcript when there are no messages. */
  emptyState?: JSX.Element
}
