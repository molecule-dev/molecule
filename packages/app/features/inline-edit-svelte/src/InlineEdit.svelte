<!--
  InlineEdit: the Svelte counterpart of `@molecule/app-inline-edit-react`'s
  `InlineEdit` — click-to-edit text with the same props (React names) and the
  same DOM for the same input. React's `renderRead` render prop is a snippet.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button, Input, Textarea } from '@molecule/app-ui-svelte'

  import type { InlineEditProps } from './types.js'

  let {
    value,
    onSubmit,
    variant = 'input',
    renderRead,
    placeholder,
    className,
  }: InlineEditProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  let editing = $state(false)
  let draft = $state(untrack(() => value))
  let saving = $state(false)
  /** The editor's root element, focused once each time editing starts. */
  let editorEl = $state<HTMLElement | null>(null)
  /** Whether the current editing session has focused its field already. */
  let focused = false
  /** The `value` prop the draft last re-synced from. */
  let syncedValue = untrack(() => value)

  // React's `useEffect(() => setDraft(value), [value])`: only an actual change
  // of `value` re-syncs, so an unrelated prop update leaves the draft alone.
  $effect(() => {
    const next = value
    if (next !== syncedValue) {
      syncedValue = next
      draft = next
    }
  })

  // React's `useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])`:
  // once per editing session, so a variant switch keeps the field as it is.
  $effect(() => {
    if (editing) {
      if (!focused) {
        focused = true
        const field = editorEl?.querySelector('input, textarea')
        if (field instanceof HTMLElement) field.focus()
      }
    } else {
      focused = false
    }
  })

  /**
   * Submits the current draft value by calling `onSubmit`, then closes the
   * editor.
   * @returns A promise that settles once the save does.
   */
  const commit = async (): Promise<void> => {
    if (saving) return
    saving = true
    try {
      await onSubmit(draft)
      editing = false
    } finally {
      saving = false
    }
  }

  /** Cancels editing, restoring the draft to the current committed value. */
  const cancel = (): void => {
    draft = value
    editing = false
  }

  /**
   * Handles keyboard events: Escape cancels, Enter (or Cmd/Ctrl+Enter for the
   * textarea) submits.
   * @param e - The keyboard event.
   */
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
    }
    if (e.key === 'Enter' && variant === 'input') {
      e.preventDefault()
      void commit()
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && variant === 'textarea') {
      e.preventDefault()
      void commit()
    }
  }

  /** The placeholder text React renders for an empty value. */
  const placeholderText = (): string =>
    placeholder ?? t('inlineEdit.empty', {}, { defaultValue: 'Click to edit' })

  /**
   * The field's accessible label (React's
   * `aria-label={placeholder ?? t('inlineEdit.aria.edit', …)}`).
   */
  const ariaLabel = (): string =>
    placeholder ?? t('inlineEdit.aria.edit', {}, { defaultValue: 'Edit' })
</script>

{#if !editing}
  <span
    role="button"
    tabindex="0"
    class={cm.cn(cm.cursorPointer, className)}
    onclick={() => {
      editing = true
    }}
    onkeydown={(e: KeyboardEvent) => {
      if (e.key === 'Enter') editing = true
    }}
  >
    {#if value}
      {#if renderRead}{@render renderRead?.(value)}{:else}{value}{/if}
    {:else}
      <span style="opacity: 0.5">{placeholderText()}</span>
    {/if}
  </span>
{:else}
  <div bind:this={editorEl} class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), className)}>
    {#if variant === 'input'}
      <Input
        type="text"
        value={draft}
        onChange={(e: Event) => {
          draft = (e.target as HTMLInputElement).value
        }}
        onKeyDown={onKey}
        aria-label={ariaLabel()}
      />
    {:else}
      <Textarea
        value={draft}
        onChange={(e: Event) => {
          draft = (e.target as HTMLTextAreaElement).value
        }}
        onKeyDown={onKey}
        aria-label={ariaLabel()}
      />
    {/if}
    <Button variant="ghost" size="sm" onClick={cancel} disabled={saving}>
      {t('inlineEdit.cancel', {}, { defaultValue: 'Cancel' })}
    </Button>
    <Button
      variant="solid"
      color="primary"
      size="sm"
      onClick={() => void commit()}
      disabled={saving}
    >
      {saving
        ? t('inlineEdit.saving', {}, { defaultValue: 'Saving…' })
        : t('inlineEdit.save', {}, { defaultValue: 'Save' })}
    </Button>
  </div>
{/if}
