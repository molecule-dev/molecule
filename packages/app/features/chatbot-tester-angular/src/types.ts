/**
 * Types of `@molecule/app-chatbot-tester-angular` — the Angular counterpart of
 * `@molecule/app-chatbot-tester-react`: same props (React names) and same DOM.
 *
 * @module
 */

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

/**
 * Props accepted by {@link ChatbotTester} — the same props
 * `@molecule/app-chatbot-tester-react` accepts. Node props (`error`,
 * `emptyState`, `botPickerLabel`) are projected content in Angular (an input
 * cannot carry a node): `[slot=error]` / `[slot=emptyState]` /
 * `[slot=botPickerLabel]`, or a template reference passed as an input.
 */
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
  /** Last error message, as `[slot=error]` content or a template reference. */
  error?: unknown
  /** Empty-state content, as `[slot=emptyState]` content or a template reference. */
  emptyState?: unknown
  /** The bot picker's label, as `[slot=botPickerLabel]` content or a template reference — an explicit value overrides `t('chatbotTester.label.testBot')` (`'Test bot'`). */
  botPickerLabel?: unknown
  /** Composer placeholder — an explicit value overrides `t('chatbotTester.placeholder.message')` (`'Type a message…'`). */
  inputPlaceholder?: string
  /** Send button label — an explicit value overrides `t('chatbotTester.label.send')` (`'Send'`). */
  sendLabel?: string
  /** Extra classes on the outer wrapper. */
  className?: string
}

/** Props accepted by {@link ChatbotTesterInput} — the same props as React's `ChatbotTesterInput`. */
export interface ChatbotTesterInputProps {
  /** The composer's current text (controlled). */
  value: string
  /** Called with the field's new text on every edit. */
  onChange?: (next: string) => void
  /** Called when the user presses Enter (without Shift) or clicks send. */
  onSend?: () => void
  /** A reply is in flight: the field and the send button are disabled. */
  loading?: boolean
  /** Placeholder text — an explicit value overrides `t('chatbotTester.placeholder.message')` (`'Type a message…'`). */
  placeholder?: string
  /** Send button label — an explicit value overrides `t('chatbotTester.label.send')` (`'Send'`). */
  sendLabel?: string
}

/**
 * Props accepted by {@link ChatbotTesterMessages} — the same props as React's
 * `ChatbotTesterMessages`. `emptyState` is `[slot=emptyState]` content or a
 * template reference.
 */
export interface ChatbotTesterMessagesProps {
  /** The transcript, in display order. */
  messages: TesterMessage[]
  /** A reply is in flight: the typing indicator is appended. */
  loading?: boolean
  /** Rendered instead of the transcript when there are no messages. */
  emptyState?: unknown
}
