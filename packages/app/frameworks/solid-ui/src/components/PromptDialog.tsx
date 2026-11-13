/**
 * PromptDialog component — the shared "ask for a short string" modal.
 *
 * The shared home for what `window.prompt` used to do (renaming a board,
 * creating a tag, "invite by email"). For a confirm WITHOUT an input use
 * {@link ConfirmDialog}; for an INLINE two-click arm/commit button use
 * {@link ConfirmButton}.
 *
 * @module
 */

import {
  type Component,
  createEffect,
  createSignal,
  type JSX,
  on,
  Show,
  splitProps,
} from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { Button } from './Button.jsx'
import { Input } from './Input.jsx'
import { Modal } from './Modal.jsx'

/** Props for {@link PromptDialog}. */
export interface PromptDialogProps {
  /** Whether the dialog is open. */
  open: boolean
  /** Called when the dialog should close (escape, backdrop, cancel, or a fulfilled `onSubmit`). */
  onClose: () => void
  /** Dialog heading. */
  title: JSX.Element
  /** Explanatory line under the title. */
  description?: JSX.Element
  /** Input placeholder. */
  placeholder?: string
  /** Value the input starts from every time the dialog opens. */
  initialValue?: string
  /**
   * Called with the entered value on confirm. Resolve to close the dialog;
   * reject or throw to keep it open (show the error via `children`).
   */
  onSubmit: (value: string) => void | Promise<void>
  /** Confirm-button label. Falls back to a localized "Confirm". */
  confirmLabel?: JSX.Element
  /** Cancel-button label. Falls back to a localized "Cancel". */
  cancelLabel?: JSX.Element
  /** Render the confirm button in the error color (e.g. an irreversible reset). */
  destructive?: boolean
  /** `data-mol-id` for the text input. */
  inputMolId?: string
  /** `data-mol-id` for the confirm button. */
  confirmMolId?: string
  /** `data-mol-id` for the cancel button. */
  cancelMolId?: string
  /** Extra body content under the input (error banners, hints). */
  children?: JSX.Element
}

/**
 * Modal that asks the user for a short string, replacing `window.prompt`.
 *
 * @param props - Component props (see {@link PromptDialogProps}).
 * @returns The rendered prompt dialog.
 */
export const PromptDialog: Component<PromptDialogProps> = (props) => {
  const [local] = splitProps(props, [
    'open',
    'onClose',
    'title',
    'description',
    'placeholder',
    'initialValue',
    'onSubmit',
    'confirmLabel',
    'cancelLabel',
    'destructive',
    'inputMolId',
    'confirmMolId',
    'cancelMolId',
    'children',
  ])
  const cm = getClassMap()
  const { t } = useTranslation()
  const [value, setValue] = createSignal(local.initialValue ?? '')
  const [pending, setPending] = createSignal(false)

  // Re-seed from initialValue each open so a reopened dialog shows the
  // CURRENT value, not whatever the user typed last time.
  createEffect(
    on(
      () => [local.open, local.initialValue] as const,
      () => {
        if (local.open) {
          setValue(local.initialValue ?? '')
          setPending(false)
        }
      },
    ),
  )

  /**
   * Submits the entered value; closes on success, stays open on failure.
   *
   * @param event - The form's submit event.
   */
  const handleSubmit = (event: Event & { currentTarget: HTMLFormElement }): void => {
    event.preventDefault()
    if (pending()) return
    setPending(true)
    void Promise.resolve(local.onSubmit(value()))
      .then(() => {
        // A parent that keeps the dialog open (a multi-stage flow advancing in
        // onClose) gets a form that accepts the next submit.
        setPending(false)
        local.onClose()
      })
      .catch((_error: unknown) => {
        // Deliberate: a rejection keeps the dialog open (see the module
        // remarks); the caller owns the error and renders it through
        // `children`, so re-displaying or logging it here would duplicate
        // that.
        setPending(false)
      })
  }

  /**
   * Closes the dialog unless a submit is pending (React passes a no-op while
   * pending, so Escape and the backdrop cannot abandon an in-flight save).
   */
  const handleClose = (): void => {
    if (pending()) return
    local.onClose()
  }

  return (
    <Modal open={local.open} onClose={handleClose}>
      <form onSubmit={handleSubmit}>
        <div class={cm.stack(3)}>
          <h2 class={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>{local.title}</h2>
          <Show when={local.description}>
            <p class={cm.textSize('sm')}>{local.description}</p>
          </Show>
          <Input
            value={value()}
            onChange={(event) => setValue((event.target as HTMLInputElement).value)}
            placeholder={local.placeholder}
            aria-label={typeof local.title === 'string' ? local.title : local.placeholder}
            disabled={pending()}
            data-mol-id={local.inputMolId}
          />
          {local.children}
          <div class={cm.flex({ justify: 'end', gap: 'sm' })}>
            <Button
              type="button"
              variant="ghost"
              onClick={local.onClose}
              disabled={pending()}
              data-mol-id={local.cancelMolId}
            >
              {local.cancelLabel ?? t('prompt.cancel', {}, { defaultValue: 'Cancel' })}
            </Button>
            <Button
              type="submit"
              variant="solid"
              color={local.destructive ? 'error' : 'primary'}
              disabled={pending()}
              data-mol-id={local.confirmMolId}
            >
              {local.confirmLabel ?? t('prompt.confirm', {}, { defaultValue: 'Confirm' })}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
