/**
 * `@molecule/app-chatbot-tester-angular` — Angular sandbox UI shell for
 * live-testing conversational AI: optional bot picker, message transcript,
 * input row, error display.
 *
 * Stateless about transport. The consumer owns the message array, send
 * handler, and bot list; the package handles the layout and composition.
 *
 * Extracted from the ai-chatbot-builder TestChat page; usable for any
 * "preview your bot live" UI. This is the Angular counterpart of
 * `@molecule/app-chatbot-tester-react`: the same props (React names) and the
 * same DOM for the same input, so an app swaps framework by changing only the
 * package name in its imports.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { ChatbotTester, type TesterMessage } from '@molecule/app-chatbot-tester-angular'
 *
 * @Component({
 *   selector: 'app-test-chat',
 *   standalone: true,
 *   imports: [ChatbotTester],
 *   template: `
 *     <div
 *       mol-chatbot-tester
 *       [messages]="messages"
 *       [onSend]="handleSend"
 *       [loading]="sending"
 *       [bots]="bots"
 *       [botId]="botId"
 *       [onBotChange]="setBotId"
 *       [error]="error"
 *     ></div>
 *   `,
 * })
 * export class TestChat {
 *   messages: TesterMessage[] = []
 *   bots = [
 *     { id: 'support', name: 'Support bot' },
 *     { id: 'sales', name: 'Sales bot' },
 *   ]
 *   botId = 'support'
 *   sending = false
 *   error?: string
 *
 *   setBotId = (id: string): void => {
 *     this.botId = id
 *   }
 *
 *   handleSend = async (text: string): Promise<void> => {
 *     this.messages = [...this.messages, { id: Date.now(), role: 'user', content: text }]
 *     const reply = await http.post(`/api/conversations/${conversationId}/messages`, { content: text })
 *     this.messages = [...this.messages, { id: reply.id, role: 'assistant', content: reply.content }]
 *   }
 * }
 * ```
 *
 * @remarks
 * Built-in labels (`botPickerLabel` "Test bot", `inputPlaceholder`
 * "Type a message…", `sendLabel` "Send") go through `t()` with the
 * `chatbotTester.*` keys of the companion locale bond
 * `@molecule/app-locales-chatbot-tester`; an explicit prop still overrides
 * them.
 * Enter sends; Shift+Enter inserts a newline. The bot picker renders only
 * when `bots` has 2+ entries. Node props are projected content in Angular:
 * `[slot=error]`, `[slot=emptyState]`, `[slot=botPickerLabel]`, or a template
 * reference passed as the input. Styling includes Tailwind classes with
 * Material-3 tokens (`bg-surface-container-high`, `border-outline-variant`,
 * `text-on-primary`, …) — the app's Tailwind theme must define those tokens
 * (the default molecule Tailwind ClassMap bond does); with a non-Tailwind
 * ClassMap the bubbles/borders lose their styling.
 *
 * @module
 */

export * from './chatbot-tester.component.js'
export * from './chatbot-tester-input.component.js'
export * from './chatbot-tester-messages.component.js'
export * from './types.js'
