/**
 * `@molecule/app-chatbot-tester-svelte` — Svelte sandbox UI shell for
 * live-testing conversational AI: optional bot picker, message transcript,
 * input row, error display.
 *
 * Stateless about transport. The consumer owns the message array, send
 * handler, and bot list; the package handles the layout and composition.
 *
 * Extracted from the ai-chatbot-builder TestChat page; usable for any
 * "preview your bot live" UI. This is the Svelte counterpart of
 * `@molecule/app-chatbot-tester-react`: the same props (React names) and the
 * same DOM for the same input, so an app swaps framework by changing only the
 * package name in its imports. React's node props are Svelte snippets (or
 * plain strings).
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { ChatbotTester, type TesterMessage } from '@molecule/app-chatbot-tester-svelte'
 *
 *   let messages: TesterMessage[] = []
 *   let sending = false
 *
 *   async function handleSend(text: string): Promise<void> {
 *     messages = [...messages, { id: Date.now(), role: 'user', content: text }]
 *     const reply = await http.post(`/api/conversations/${conversationId}/messages`, { content: text })
 *     messages = [...messages, { id: reply.id, role: 'assistant', content: reply.content }]
 *   }
 * </script>
 *
 * <ChatbotTester
 *   {messages}
 *   onSend={handleSend}
 *   loading={sending}
 *   {bots}
 *   {botId}
 *   onBotChange={(id) => (botId = id)}
 *   {error}
 * />
 * ```
 *
 * @remarks
 * Built-in labels (`botPickerLabel` "Test bot", `inputPlaceholder`
 * "Type a message…", `sendLabel` "Send") go through `t()` with the
 * `chatbotTester.*` keys of the companion locale bond
 * `@molecule/app-locales-chatbot-tester`; an explicit prop still overrides
 * them.
 * Enter sends; Shift+Enter inserts a newline. The bot picker renders only
 * when `bots` has 2+ entries. Styling includes Tailwind classes with
 * Material-3 tokens (`bg-surface-container-high`, `border-outline-variant`,
 * `text-on-primary`, …) — the app's Tailwind theme must define those tokens
 * (the default molecule Tailwind ClassMap bond does); with a non-Tailwind
 * ClassMap the bubbles/borders lose their styling.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
