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
 * import { useState } from 'react'
 *
 * import { ChatbotTester, type TesterMessage } from '@molecule/app-chatbot-tester-react'
 * import { createFetchClient } from '@molecule/app-http'
 * import { setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-tailwind'
 *
 * // Startup, once.
 * setClassMap(classMap)
 * const http = createFetchClient({ baseURL: '/api' })
 *
 * const bots = [
 *   { id: 'support', name: 'Support bot' },
 *   { id: 'sales', name: 'Sales bot' },
 * ]
 *
 * export function TestChat() {
 *   const [botId, setBotId] = useState('support')
 *   const [messages, setMessages] = useState<TesterMessage[]>([])
 *   const [sending, setSending] = useState(false)
 *   const [error, setError] = useState<string | null>(null)
 *
 *   const handleSend = async (text: string) => {
 *     setMessages((prev) => [...prev, { id: `u-${prev.length}`, role: 'user', content: text }])
 *     setSending(true)
 *     setError(null)
 *     try {
 *       const res = await http.post<{ id: string; content: string }>(`/bots/${botId}/test-messages`, { content: text })
 *       setMessages((prev) => [...prev, { id: res.data.id, role: 'assistant', content: res.data.content }])
 *     } catch (err) {
 *       setError(err instanceof Error ? err.message : String(err))
 *     } finally {
 *       setSending(false)
 *     }
 *   }
 *
 *   return (
 *     <ChatbotTester
 *       messages={messages}
 *       onSend={handleSend}
 *       loading={sending}
 *       bots={bots}
 *       botId={botId}
 *       onBotChange={(id) => {
 *         setBotId(id)
 *         setMessages([])
 *       }}
 *       error={error}
 *       emptyState={<p>Say hi to test your bot.</p>}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * **It sends nothing by itself.** `onSend(text)` receives the trimmed
 * composer text (empty input is ignored, the box is cleared first) — you
 * append the user message, call your API, and append the reply; the
 * component never adds messages to `messages`. `loading` shows a "..."
 * indicator and disables the textarea and Send; `error` renders in a
 * `role="alert"` paragraph. `emptyState` shows only while there are no
 * messages and `loading` is false. It needs `setClassMap(...)` from `@molecule/app-ui` at
 * startup (`getClassMap()` throws otherwise); no i18n provider is needed.
 *
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
