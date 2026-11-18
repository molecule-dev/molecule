<!--
  ChatbotTesterInput: the Svelte counterpart of
  `@molecule/app-chatbot-tester-react`'s `ChatbotTesterInput` — composer row with
  a send button. Same props (React names), same DOM for the same input: Enter
  sends, Shift+Enter inserts a newline, and a controlled textarea keeps its
  prop value after an edit, as react-dom restores it.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { ChatbotTesterInputProps } from './types.js'

  let { value, onChange, onSend, loading, placeholder, sendLabel }: ChatbotTesterInputProps =
    $props()

  const { t } = useTranslation()
  const cm = $derived(getClassMap())
  /** React's `placeholder` default (undefined only): `t()`'s `'Type a message…'`. */
  const placeholderText = $derived(
    placeholder === undefined
      ? t('chatbotTester.placeholder.message', undefined, { defaultValue: 'Type a message…' })
      : placeholder,
  )
  /** React's `sendLabel` default (undefined only): `t()`'s `'Send'`. */
  const sendText = $derived(
    sendLabel === undefined
      ? t('chatbotTester.label.send', undefined, { defaultValue: 'Send' })
      : sendLabel,
  )

  /**
   * Reports the edit, then restores the controlled value exactly as react-dom
   * does after a controlled input's change event.
   *
   * @param event - The native input event.
   */
  function handleInput(event: Event): void {
    const field = event.target as HTMLTextAreaElement
    onChange(field.value)
    if (field.value !== value) field.value = value
  }

  /**
   * Enter sends; Shift+Enter is left to the browser (a newline).
   *
   * @param event - The native keydown event.
   */
  function handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      onSend()
    }
  }

  /**
   * Passes the click event to the callback, as React's DOM handler does.
   *
   * @param event - The native click event.
   */
  function handleClick(event: MouseEvent): void {
    ;(onSend as (event?: MouseEvent) => void)(event)
  }
</script>

<div
  class={cm.cn(
    cm.flex({ align: 'end', gap: 2 }),
    cm.sp('px', 6),
    cm.sp('py', 4),
    cm.chatbotTesterInputRow,
  )}
>
  <textarea
    {value}
    oninput={handleInput}
    onkeydown={handleKeydown}
    rows={1}
    placeholder={placeholderText}
    disabled={loading}
    class={cm.cn(
      cm.flex1,
      cm.sp('px', 4),
      cm.sp('py', 2),
      cm.textSize('sm'),
      cm.surface,
      cm.chatbotTesterInputField,
    )}></textarea>
  <button
    type="button"
    data-mol-id="chatbot-tester-send"
    onclick={handleClick}
    disabled={Boolean(loading) || !value.trim()}
    class={cm.cn(
      cm.button({ variant: 'solid', color: 'primary', size: 'sm' }),
      cm.touchTargetCompact,
    )}
  >
    {sendText}
  </button>
</div>
