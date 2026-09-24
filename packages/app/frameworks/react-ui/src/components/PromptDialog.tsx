/**
 * PromptDialog component — the shared "ask for a short string" modal.
 *
 * The shared home for what `window.prompt` used to do (renaming, renaming a
 * board, creating a tag, "invite by email"). `window.prompt` is broken
 * headless (it hangs e2e) and awkward on touch; this renders the same
 * interaction as a real dialog built on {@link Modal}. For a confirm WITHOUT
 * an input use {@link ConfirmDialog}; for an INLINE two-click arm/commit
 * button use {@link ConfirmButton}.
 *
 * @example
 * ```tsx
 * import { PromptDialog } from '@molecule/app-ui-react'
 *
 * <PromptDialog
 *   open={renameOpen}
 *   onClose={() => setRenameOpen(false)}
 *   title={t('board.renameTitle', {}, { defaultValue: 'Rename board' })}
 *   placeholder={t('board.namePlaceholder', {}, { defaultValue: 'Board name' })}
 *   initialValue={board.name}
 *   confirmLabel={t('common.save', {}, { defaultValue: 'Save' })}
 *   onSubmit={async (name) => {
 *     await renameBoard(board.id, name) // resolve → dialog closes
 *   }}
 * />
 * ```
 *
 * @remarks
 * `onSubmit` receives the RAW entered value (no trimming — the caller owns
 * validation). Resolve it and the dialog closes and resets; reject or throw
 * and the dialog STAYS OPEN with the value intact — render your error
 * message through `children` (e.g. an `<Alert status="error">`), since the
 * rejection itself is deliberately swallowed here. While the promise is
 * pending the input and both buttons are disabled, so the action cannot
 * double-fire. Enter submits; Escape and the backdrop cancel exactly like a
 * Modal. Optional `inputMolId` / `confirmMolId` / `cancelMolId` render as
 * `data-mol-id` attributes for e2e locators; the buttons are also
 * text-labeled so `getByRole('button', { name })` reaches them.
 *
 * @module
 */

import React, { type JSX, useEffect, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { Button } from './Button.js'
import { Input } from './Input.js'
import { Modal } from './Modal.js'

/** Props for {@link PromptDialog}. */
export interface PromptDialogProps {
  /** Whether the dialog is open. */
  open: boolean
  /** Called when the dialog should close (escape, backdrop, cancel, or a fulfilled {@link PromptDialogProps.onSubmit}). */
  onClose: () => void
  /** Dialog heading. */
  title: React.ReactNode
  /** Explanatory line under the title. */
  description?: React.ReactNode
  /** Input placeholder. */
  placeholder?: string
  /** Value the input starts from every time the dialog opens. */
  initialValue?: string
  /**
   * Called with the entered value on confirm. Resolve to close the dialog;
   * reject or throw to keep it open (show the error via {@link PromptDialogProps.children}).
   */
  onSubmit: (value: string) => void | Promise<void>
  /** Confirm-button label. Falls back to a localized "Confirm". */
  confirmLabel?: React.ReactNode
  /** Cancel-button label. Falls back to a localized "Cancel". */
  cancelLabel?: React.ReactNode
  /** Render the confirm button in the error color (e.g. an irreversible reset). */
  destructive?: boolean
  /** `data-mol-id` for the text input. */
  inputMolId?: string
  /** `data-mol-id` for the confirm button. */
  confirmMolId?: string
  /** `data-mol-id` for the cancel button. */
  cancelMolId?: string
  /** Extra body content under the input (error banners, hints). */
  children?: React.ReactNode
}

/**
 * Modal that asks the user for a short string, replacing `window.prompt`.
 *
 * @param props - Component props (see {@link PromptDialogProps}).
 */
export function PromptDialog({
  open,
  onClose,
  title,
  description,
  placeholder,
  initialValue = '',
  onSubmit,
  confirmLabel,
  cancelLabel,
  destructive = false,
  inputMolId,
  confirmMolId,
  cancelMolId,
  children,
}: PromptDialogProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [value, setValue] = useState(initialValue)
  const [pending, setPending] = useState(false)

  // Re-seed from initialValue each open so a reopened dialog shows the
  // CURRENT value, not whatever the user typed last time.
  useEffect(() => {
    if (open) {
      setValue(initialValue)
      setPending(false)
    }
  }, [open, initialValue])

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (pending) return
    setPending(true)
    void Promise.resolve(onSubmit(value))
      .then(() => onClose())
      .catch(() => {
        // Deliberate: a rejection keeps the dialog open (see @remarks);
        // the caller renders the error through `children`.
        setPending(false)
      })
  }

  return (
    <Modal open={open} onClose={pending ? () => {} : onClose}>
      <form onSubmit={handleSubmit}>
        <div className={cm.stack(3)}>
          <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>{title}</h2>
          {description ? <p className={cm.textSize('sm')}>{description}</p> : null}
          <Input
            value={value}
            onChange={(e) => setValue((e.target as HTMLInputElement).value)}
            placeholder={placeholder}
            aria-label={typeof title === 'string' ? title : placeholder}
            disabled={pending}
            autoFocus
            data-mol-id={inputMolId}
          />
          {children}
          <div className={cm.flex({ justify: 'end', gap: 'sm' })}>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={pending}
              data-mol-id={cancelMolId}
            >
              {cancelLabel ?? t('prompt.cancel', {}, { defaultValue: 'Cancel' })}
            </Button>
            <Button
              type="submit"
              variant="solid"
              color={destructive ? 'error' : 'primary'}
              disabled={pending}
              data-mol-id={confirmMolId}
            >
              {confirmLabel ?? t('prompt.confirm', {}, { defaultValue: 'Confirm' })}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
