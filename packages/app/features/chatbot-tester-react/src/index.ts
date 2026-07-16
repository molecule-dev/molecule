/**
 * `@molecule/app-chatbot-tester-react` — sandbox UI shell for live-testing
 * conversational AI: optional bot picker, message transcript, input row,
 * error display.
 *
 * Stateless about transport. The consumer owns the message array, send
 * handler, and bot list; the package handles the layout and composition.
 *
 * Extracted from the ai-chatbot-builder TestChat page; usable for any
 * "preview your bot live" UI.
 *
 * @example
 * ```tsx
 * import { ChatbotTester, type TesterMessage } from '@molecule/app-chatbot-tester-react'
 *
 * const [messages, setMessages] = useState<TesterMessage[]>([])
 * const handleSend = async (text: string) => {
 *   setMessages((prev) => [...prev, { id: Date.now(), role: 'user', content: text }])
 *   const reply = await http.post(`/api/conversations/${conversationId}/messages`, { content: text })
 *   setMessages((prev) => [...prev, { id: reply.id, role: 'assistant', content: reply.content }])
 * }
 *
 * <ChatbotTester
 *   messages={messages}
 *   onSend={handleSend}
 *   loading={sending}
 *   bots={bots}
 *   botId={botId}
 *   onBotChange={setBotId}
 *   error={error}
 * />
 * ```
 *
 * @remarks
 * Built-in labels (`botPickerLabel` default "Test bot", `inputPlaceholder`
 * default "Type a message…", `sendLabel` default "Send") are hardcoded
 * English — there is no companion locale bond. For localized apps, pass all
 * three props with `t('key', {}, { defaultValue: '…' })` values.
 * Enter sends; Shift+Enter inserts a newline. The bot picker renders only
 * when `bots` has 2+ entries. Styling includes Tailwind classes with
 * Material-3 tokens (`bg-surface-container-high`, `border-outline-variant`,
 * `text-on-primary`, …) — the app's Tailwind theme must define those tokens
 * (the default molecule Tailwind ClassMap bond does); with a non-Tailwind
 * ClassMap the bubbles/borders lose their styling.
 *
 * @module
 */

export * from './ChatbotTester.js'
export * from './ChatbotTesterInput.js'
export * from './ChatbotTesterMessages.js'
export * from './types.js'
