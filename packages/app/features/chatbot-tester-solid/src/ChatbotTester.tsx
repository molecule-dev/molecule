/**
 * Solid composed chatbot-tester sandbox UI: optional bot picker + messages
 * thread + input row + error region.
 *
 * Stateless about transport: the consumer owns the message array, the send
 * handler and (optionally) the bot list + current bot id. The composer text is
 * this component's own state, exactly as in React.
 *
 * Solid counterpart of `@molecule/app-chatbot-tester-react`'s `ChatbotTester` —
 * the same props (React names) and the same DOM for the same input.
 *
 * @module
 */

import { type Component, createEffect, createSignal, For, Show } from 'solid-js'

import { PresentWhileNode, ResolveNode, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { ChatbotTesterInput } from './ChatbotTesterInput.jsx'
import { ChatbotTesterMessages } from './ChatbotTesterMessages.jsx'
import { applyReactSelectSelection } from './dom.js'
import type { ChatbotTesterProps, TesterBotOption } from './types.js'

/**
 * Full chatbot tester sandbox.
 *
 * @param props - Component props (see {@link ChatbotTesterProps}).
 * @returns The rendered tester.
 */
export const ChatbotTester: Component<ChatbotTesterProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [input, setInput] = createSignal('')
  let selectEl: HTMLSelectElement | undefined

  /**
   * The bot list React renders (its `bots ?? []`).
   *
   * @returns The bot options.
   */
  const bots = (): TesterBotOption[] => props.bots ?? []

  /** Re-applies react-dom's controlled-select selection. */
  const applySelection = (): void => {
    applyReactSelectSelection(selectEl, props.botId ?? '')
  }

  // Runs after the picker's options are patched, on mount and on every prop
  // change, as react-dom's controlled `<select>` update does.
  createEffect(() => {
    void props.bots
    void props.botId
    applySelection()
  })

  /** Sends the trimmed composer text and clears the field. */
  const handleSend = async (): Promise<void> => {
    const text = input().trim()
    if (!text) return
    setInput('')
    await props.onSend(text)
  }

  /**
   * Reports the selected bot, then restores the controlled selection the way
   * react-dom does after a controlled select's change event.
   *
   * @param event - The native change event.
   */
  const handleBotChange = (event: Event): void => {
    props.onBotChange?.((event.target as HTMLSelectElement).value)
    applySelection()
  }

  const pickerVisible = (): boolean => bots().length > 1

  return (
    <div class={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, cm.minW(0), props.className)}>
      <Show when={pickerVisible()}>
        <div
          class={cm.cn(
            cm.flex({ align: 'center' }),
            cm.sp('px', 6),
            cm.sp('py', 3),
            cm.chatbotTesterBotBar,
          )}
        >
          <label
            for="chatbot-tester-bot-select"
            class={cm.cn(cm.textSize('xs'), cm.fontWeight('bold'))}
          >
            <ResolveNode node={props.botPickerLabel}>
              {(label, hasLabel) => (
                <Show
                  when={hasLabel()}
                  fallback={t('chatbotTester.label.testBot', undefined, {
                    defaultValue: 'Test bot',
                  })}
                >
                  {label()}
                </Show>
              )}
            </ResolveNode>
          </label>
          <select
            ref={(el) => {
              selectEl = el
            }}
            id="chatbot-tester-bot-select"
            onChange={handleBotChange}
            class={cm.cn(cm.textSize('sm'), cm.chatbotTesterBotSelect)}
          >
            <For each={bots()}>{(bot) => <option value={bot.id}>{bot.name || bot.id}</option>}</For>
          </select>
        </div>
      </Show>
      <ChatbotTesterMessages
        messages={props.messages}
        loading={props.loading}
        emptyState={props.emptyState}
      />
      <PresentWhileNode node={props.error}>
        {(error) => (
          <p
            role="alert"
            class={cm.cn(cm.textSize('sm'), cm.sp('px', 6), cm.sp('py', 2), cm.textError)}
          >
            {error()}
          </p>
        )}
      </PresentWhileNode>
      <ChatbotTesterInput
        value={input()}
        onChange={setInput}
        onSend={handleSend}
        loading={props.loading}
        placeholder={props.inputPlaceholder}
        sendLabel={props.sendLabel}
      />
    </div>
  )
}
