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
 * WIZARD GOTCHA (learned the hard way, fleet migration 2026-09-24): a
 * fulfilled submit calls `onClose()` — "close", not "cancel". A multi-stage
 * flow that advances its stage INSIDE `onSubmit` gets clobbered if its
 * `onClose` unconditionally resets to idle (the auto-close fires right
 * after the stage advance). Make `onClose` stage-aware via functional
 * state (`setStage((cur) => (cur === 'name' ? 'idle' : cur))`) so cancel
 * still resets but the post-submit auto-close doesn't undo the advance.
 *
 * @module
 */

import React, { type JSX, useId, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { slot } from '@molecule/app-react/render'
import type { KitEvent } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Box, FormArea, Text } from '@molecule/app-ui-react/elements'

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
  title: titleProp,
  description: descriptionProp,
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
  const inputRef = useRef<HTMLInputElement | null>(null)
  // The dialog names itself with its visible title and, when rendered, its
  // description (WAI-ARIA dialog pattern): the ids reach the dialog element
  // through Modal's `aria-*` pass-through, so screen readers announce
  // "Rename board — The slug updates automatically." instead of an unnamed
  // dialog (axe `aria-dialog-name`). A title that renders nothing names
  // nothing, so the dialog then points at no heading, as a port that decides
  // from its slot content does.
  const titleId = useId()
  const descriptionId = useId()
  const title = slot(titleProp)
  const description = slot(descriptionProp)

  // Re-seed from initialValue each open so a reopened dialog shows the
  // CURRENT value, not whatever the user typed last time. Adjusted during
  // render (React's pattern for state derived from a changed input) so the
  // seeded value is what the opening frame paints, rather than a second
  // render pass after it.
  const [seededFrom, setSeededFrom] = useState({ open, initialValue })
  if (seededFrom.open !== open || seededFrom.initialValue !== initialValue) {
    setSeededFrom({ open, initialValue })
    if (open) {
      setValue(initialValue)
      setPending(false)
    }
  }

  const handleSubmit = async (e: KitEvent): Promise<void> => {
    e.preventDefault()
    if (pending) return
    setPending(true)
    try {
      await onSubmit(value)
      onClose()
    } catch (_error) {
      // The caller displays the submission error. Keep the input available to retry.
    } finally {
      setPending(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={pending ? () => {} : onClose}
      // The dialog exists to take one string, so opening it puts focus in the input.
      initialFocus={inputRef}
      aria-labelledby={title === undefined ? undefined : titleId}
      aria-describedby={description === undefined ? undefined : descriptionId}
    >
      <FormArea as="form" onSubmit={handleSubmit}>
        <Box as="div" className={cm.stack(3)}>
          <Text
            as="h2"
            id={title === undefined ? undefined : titleId}
            className={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}
          >
            {title}
          </Text>
          {description !== undefined ? (
            <Text as="p" id={descriptionId} className={cm.textSize('sm')}>
              {description}
            </Text>
          ) : null}
          <Input
            ref={inputRef}
            value={value}
            onChange={({ target }) => {
              if (target && 'value' in target && typeof target.value === 'string') {
                setValue(target.value)
              }
            }}
            placeholder={placeholder}
            aria-label={typeof title === 'string' ? title : placeholder}
            disabled={pending}
            data-mol-id={inputMolId}
          />
          {children}
          <Box as="div" className={cm.flex({ justify: 'end', gap: 'sm' })}>
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
          </Box>
        </Box>
      </FormArea>
    </Modal>
  )
}
