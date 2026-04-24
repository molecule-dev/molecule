import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Input, Textarea } from '@molecule/app-ui-react'

interface InlineEditProps {
  /** Current value. */
  value: string
  /** Called when the user commits a new value. Return a Promise to block the UI while saving. */
  onSubmit: (next: string) => void | Promise<void>
  /** Render mode for the editor. */
  variant?: 'input' | 'textarea'
  /** Renderer for the read state — defaults to plain text. */
  renderRead?: (value: string) => ReactNode
  /** Placeholder when value is empty. */
  placeholder?: string
  /** Extra classes. */
  className?: string
}

/**
 * Click-to-edit text. Renders the value as text by default; on click
 * (or focus via tab + Enter), swaps in an `<Input>` / `<Textarea>` for
 * inline editing. Enter submits, Escape cancels.
 *
 * Common in titles, descriptions, table cells where modal-based forms
 * would be heavyweight.
 * @param root0
 * @param root0.value
 * @param root0.onSubmit
 * @param root0.variant
 * @param root0.renderRead
 * @param root0.placeholder
 * @param root0.className
 */
export function InlineEdit({
  value,
  onSubmit,
  variant = 'input',
  renderRead,
  placeholder,
  className,
}: InlineEditProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])
  useEffect(() => {
    setDraft(value)
  }, [value])

  /**
   *
   */
  async function commit() {
    if (saving) return
    setSaving(true)
    try {
      await onSubmit(draft)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }
  /**
   *
   */
  function cancel() {
    setDraft(value)
    setEditing(false)
  }
  /**
   *
   * @param e
   */
  function onKey(e: KeyboardEvent) {
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

  if (!editing) {
    return (
      <span
        role="button"
        tabIndex={0}
        onClick={() => setEditing(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') setEditing(true)
        }}
        className={cm.cn(cm.cursorPointer, className)}
      >
        {value ? (
          renderRead ? (
            renderRead(value)
          ) : (
            value
          )
        ) : (
          <span style={{ opacity: 0.5 }}>
            {placeholder ?? t('inlineEdit.empty', {}, { defaultValue: 'Click to edit' })}
          </span>
        )}
      </span>
    )
  }

  return (
    <div className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), className)}>
      {variant === 'input' ? (
        <Input
          ref={inputRef as React.Ref<HTMLInputElement>}
          type="text"
          value={draft}
          onChange={(e) => setDraft((e.target as HTMLInputElement).value)}
          onKeyDown={onKey}
          aria-label={placeholder ?? 'Edit'}
        />
      ) : (
        <Textarea
          ref={inputRef as React.Ref<HTMLTextAreaElement>}
          value={draft}
          onChange={(e) => setDraft((e.target as HTMLTextAreaElement).value)}
          onKeyDown={onKey}
          aria-label={placeholder ?? 'Edit'}
        />
      )}
      <Button variant="ghost" size="sm" onClick={cancel} disabled={saving}>
        {t('inlineEdit.cancel', {}, { defaultValue: 'Cancel' })}
      </Button>
      <Button variant="solid" color="primary" size="sm" onClick={commit} disabled={saving}>
        {saving
          ? t('inlineEdit.saving', {}, { defaultValue: 'Saving…' })
          : t('inlineEdit.save', {}, { defaultValue: 'Save' })}
      </Button>
    </div>
  )
}
