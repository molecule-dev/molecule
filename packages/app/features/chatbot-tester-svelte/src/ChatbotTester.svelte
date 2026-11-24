<!--
  ChatbotTester: the Svelte counterpart of
  `@molecule/app-chatbot-tester-react`'s `ChatbotTester` — optional bot picker +
  messages thread + composer row + error region. Same props (React names), same
  DOM for the same input; the composer text is this component's own state,
  exactly as in React. Node props are snippets (or plain strings).
-->
<script lang="ts">
  import type { Attachment } from 'svelte/attachments'

  import { PresentWhileContent, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import ChatbotTesterInput from './ChatbotTesterInput.svelte'
  import ChatbotTesterMessages from './ChatbotTesterMessages.svelte'
  import { applyReactSelectSelection } from './dom.js'
  import type { ChatbotTesterProps, TesterBotOption } from './types.js'

  let {
    messages,
    loading,
    onSend,
    bots,
    botId,
    onBotChange,
    error,
    emptyState,
    botPickerLabel,
    inputPlaceholder,
    sendLabel,
    className,
  }: ChatbotTesterProps = $props()

  const { t } = useTranslation()
  const cm = $derived(getClassMap())
  let input = $state('')
  let selectEl = $state<HTMLSelectElement | null>(null)

  /** React's `bots ?? []`. */
  const shownBots = $derived<TesterBotOption[]>(bots ?? [])
  /** React's `botPickerLabel` default: `t()`'s `'Test bot'`, used whenever the prop renders nothing. */
  const defaultLabel = $derived(
    t('chatbotTester.label.testBot', undefined, { defaultValue: 'Test bot' }),
  )
  /** A plain `botPickerLabel` value that renders as text (React's `slot(value)` keeping it). */
  const labelIsNode = $derived(
    typeof botPickerLabel !== 'function' &&
      botPickerLabel !== undefined &&
      botPickerLabel !== null &&
      botPickerLabel !== '',
  )

  // A snippet cannot tell from its value whether it renders anything, so the default label stands
  // in while the `botPickerLabel` snippet renders nothing (React's `slot(botPickerLabel) ?? default`).
  const labelFallback: Attachment<HTMLLabelElement> = (label) => {
    if (typeof botPickerLabel !== 'function') return
    const fallback = document.createTextNode(defaultLabel)
    const hasContent = (): boolean =>
      Array.from(label.childNodes).some(
        (node) =>
          node !== fallback &&
          (node.nodeType === 1 || (node.nodeType === 3 && (node.textContent ?? '').trim() !== '')),
      )
    const sync = (): void => {
      if (hasContent()) fallback.remove()
      else if (!fallback.parentNode) label.appendChild(fallback)
    }
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(label, { childList: true, characterData: true, subtree: true })
    return () => {
      observer.disconnect()
      fallback.remove()
    }
  }

  // Runs after the picker's options are patched, on mount and on every prop
  // change, as react-dom's controlled `<select>` update does.
  $effect(() => {
    void shownBots
    void botId
    applyReactSelectSelection(selectEl, botId ?? '')
  })

  /** Sends the trimmed composer text and clears the field. */
  async function handleSend(): Promise<void> {
    const text = input.trim()
    if (!text) return
    input = ''
    await onSend(text)
  }

  /**
   * Reports the selected bot, then restores the controlled selection the way
   * react-dom does after a controlled select's change event.
   *
   * @param event - The native change event.
   */
  function handleBotChange(event: Event): void {
    onBotChange?.((event.target as HTMLSelectElement).value)
    applyReactSelectSelection(selectEl, botId ?? '')
  }
</script>

<div class={cm.cn(cm.flex({ direction: 'col' }), cm.flex1, cm.minW(0), className)}>
  {#if shownBots.length > 1}
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
        {@attach labelFallback}
      >
        {#if typeof botPickerLabel === 'function'}{@render botPickerLabel?.()}{:else if labelIsNode}{botPickerLabel}{:else}{defaultLabel}{/if}
      </label>
      <select
        bind:this={selectEl}
        id="chatbot-tester-bot-select"
        onchange={handleBotChange}
        class={cm.cn(cm.textSize('sm'), cm.chatbotTesterBotSelect)}
      >
        {#each shownBots as bot (bot.id)}
          <option value={bot.id}>{bot.name || bot.id}</option>
        {/each}
      </select>
    </div>
  {/if}
  <ChatbotTesterMessages {messages} {loading} {emptyState} />
  {#if error}
    <PresentWhileContent
      tag="p"
      role="alert"
      class={cm.cn(cm.textSize('sm'), cm.sp('px', 6), cm.sp('py', 2), cm.textError)}
    >
      {#if typeof error === 'function'}{@render error?.()}{:else}{error}{/if}
    </PresentWhileContent>
  {/if}
  <ChatbotTesterInput
    value={input}
    onChange={(next: string) => (input = next)}
    onSend={handleSend}
    {loading}
    placeholder={inputPlaceholder}
    {sendLabel}
  />
</div>
