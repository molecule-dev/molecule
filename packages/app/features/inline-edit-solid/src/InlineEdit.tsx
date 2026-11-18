import { type Component, createEffect, createSignal, onMount, Show, untrack } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button, Input, Textarea } from '@molecule/app-ui-solid'

import type { InlineEditProps } from './types.js'

/** Props of the editor branch: everything the read branch hands over once editing starts. */
interface EditorProps {
  /** The draft value the field shows. */
  draft: string
  /** Render mode for the editor, with React's `'input'` default applied. */
  variant: 'input' | 'textarea'
  /** The field's accessible label. */
  ariaLabel: string
  /** Whether a save is in flight (both buttons are disabled). */
  saving: boolean
  /** Extra classes from the caller. */
  className?: string
  /** Receives each typed value. */
  onInput: (value: string) => void
  /** Handles Escape / Enter on the field. */
  onKey: (event: KeyboardEvent) => void
  /** Cancels editing. */
  onCancel: () => void
  /** Saves the draft. */
  onSave: () => void
  /** The Cancel button's label. */
  cancelLabel: string
  /** The Save button's label, or the saving label while a save is in flight. */
  saveLabel: string
}

/**
 * The editor branch: React mounts it when editing starts, so focusing the
 * field on mount is React's `useEffect(… focus …)` and a variant switch keeps
 * the same field mounted (no second focus, as in React).
 *
 * @param props - See {@link EditorProps}.
 * @returns The rendered editor.
 */
const Editor: Component<EditorProps> = (props) => {
  const cm = getClassMap()
  let root: HTMLDivElement | undefined

  onMount(() => {
    const field = root?.querySelector('input, textarea')
    if (field instanceof HTMLElement) field.focus()
  })

  return (
    <div
      ref={(element) => {
        root = element
      }}
      class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), props.className)}
    >
      <Show
        when={props.variant === 'input'}
        fallback={
          <Textarea
            value={props.draft}
            onChange={(e: Event) => props.onInput((e.target as HTMLTextAreaElement).value)}
            onKeyDown={props.onKey}
            aria-label={props.ariaLabel}
          />
        }
      >
        <Input
          type="text"
          value={props.draft}
          onChange={(e: Event) => props.onInput((e.target as HTMLInputElement).value)}
          onKeyDown={props.onKey}
          aria-label={props.ariaLabel}
        />
      </Show>
      <Button variant="ghost" size="sm" onClick={props.onCancel} disabled={props.saving}>
        {props.cancelLabel}
      </Button>
      <Button
        variant="solid"
        color="primary"
        size="sm"
        onClick={props.onSave}
        disabled={props.saving}
      >
        {props.saveLabel}
      </Button>
    </div>
  )
}

/**
 * Click-to-edit text. Renders the value as text by default; on click (or
 * focus via tab + Enter) it swaps in an `<Input>` / `<Textarea>` for inline
 * editing. Enter submits, Escape cancels.
 *
 * This is the Solid counterpart of `@molecule/app-inline-edit-react`: the
 * same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input.
 *
 * @param props - Component props (see {@link InlineEditProps}).
 * @returns The rendered inline-edit field.
 */
export const InlineEdit: Component<InlineEditProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [editing, setEditing] = createSignal(false)
  const [draft, setDraft] = createSignal(props.value)
  const [saving, setSaving] = createSignal(false)
  const variant = (): 'input' | 'textarea' => props.variant ?? 'input'

  // React's `useEffect(() => setDraft(value), [value])`: only an actual change
  // of `value` re-syncs, so a parent that re-renders with the same value — a
  // fresh row object carrying the same string — leaves the typed draft alone.
  let syncedValue = untrack(() => props.value)
  createEffect(() => {
    const next = props.value
    if (next !== syncedValue) {
      syncedValue = next
      setDraft(next)
    }
  })

  /**
   * Submits the current draft value by calling onSubmit, then closes the editor.
   * @returns A promise that settles once the save does.
   */
  const commit = async (): Promise<void> => {
    if (saving()) return
    setSaving(true)
    try {
      await props.onSubmit(draft())
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  /** Cancels editing, restoring the draft to the current committed value. */
  const cancel = (): void => {
    setDraft(props.value)
    setEditing(false)
  }

  /**
   * Handles keyboard events: Escape cancels, Enter (or Cmd/Ctrl+Enter for textarea) submits.
   * @param e - The keyboard event.
   */
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
    }
    if (e.key === 'Enter' && variant() === 'input') {
      e.preventDefault()
      void commit()
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && variant() === 'textarea') {
      e.preventDefault()
      void commit()
    }
  }

  /**
   * The placeholder text React renders for an empty value.
   * @returns The translated placeholder.
   */
  const placeholderText = (): string =>
    props.placeholder ?? t('inlineEdit.empty', {}, { defaultValue: 'Click to edit' })

  /**
   * The field's accessible label (React's
   * `aria-label={placeholder ?? t('inlineEdit.aria.edit', …)}`).
   * @returns The aria label.
   */
  const ariaLabel = (): string =>
    props.placeholder ?? t('inlineEdit.aria.edit', {}, { defaultValue: 'Edit' })

  return (
    <Show
      when={editing()}
      fallback={
        <span
          role="button"
          tabindex={0}
          onClick={() => setEditing(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setEditing(true)
          }}
          class={cm.cn(cm.cursorPointer, props.className)}
        >
          {props.value ? (
            props.renderRead ? (
              props.renderRead(props.value)
            ) : (
              props.value
            )
          ) : (
            <span style={{ opacity: 0.5 }}>{placeholderText()}</span>
          )}
        </span>
      }
    >
      <Editor
        draft={draft()}
        variant={variant()}
        ariaLabel={ariaLabel()}
        saving={saving()}
        className={props.className}
        onInput={setDraft}
        onKey={onKey}
        onCancel={cancel}
        onSave={() => void commit()}
        cancelLabel={t('inlineEdit.cancel', {}, { defaultValue: 'Cancel' })}
        saveLabel={
          saving()
            ? t('inlineEdit.saving', {}, { defaultValue: 'Saving…' })
            : t('inlineEdit.save', {}, { defaultValue: 'Save' })
        }
      />
    </Show>
  )
}
