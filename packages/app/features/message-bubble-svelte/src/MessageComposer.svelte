<!--
  MessageComposer: the Svelte counterpart of
  `@molecule/app-message-bubble-react`'s `MessageComposer` — a textarea with
  optional leading/trailing snippets and a Send button. Same props (React
  names), same DOM, same behavior: the Send button or Ctrl/Cmd+Enter (never
  plain Enter), trimmed, and cleared on submit.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button, Textarea } from '@molecule/app-ui-svelte'

  import type { MessageComposerProps } from './types.js'

  let {
    onSubmit,
    placeholder,
    submitOnEnter = true,
    leading,
    trailing,
    disabled,
    className,
  }: MessageComposerProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  let value = $state('')

  const placeholderText = $derived(
    placeholder ?? t('composer.placeholder', {}, { defaultValue: 'Write a message…' }),
  )
  const sendText = $derived(t('composer.send', {}, { defaultValue: 'Send' }))

  /** Trims the current value and calls onSubmit, then resets the textarea. */
  function submit(): void {
    const current = value.trim()
    if (!current) return
    onSubmit(current)
    value = ''
  }

  /**
   * Submits on Ctrl/Cmd+Enter when `submitOnEnter` allows it, as React does.
   *
   * @param event - The keyboard event.
   */
  function onKey(event: KeyboardEvent): void {
    if (submitOnEnter && event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      submit()
    }
  }
</script>

<div class={cm.cn(cm.flex({ align: 'end', gap: 'sm' }), cm.sp('p', 2), className)}>
  {#if leading}{@render leading?.()}{/if}
  <Textarea
    {value}
    onChange={(event: Event) => (value = (event.target as HTMLTextAreaElement).value)}
    placeholder={placeholderText}
    {disabled}
    onKeyDown={onKey}
    className={cm.flex1}
  />
  {#if trailing}{@render trailing?.()}{/if}
  <Button onClick={submit} disabled={disabled || !value.trim()}>{sendText}</Button>
</div>
