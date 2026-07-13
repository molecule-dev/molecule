/**
 * Modal component.
 *
 * @module
 */

import React, { forwardRef, useEffect, useId, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'

import { t } from '@molecule/app-i18n'
import type { ModalProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { renderIcon } from '../utilities/renderIcon.js'

/** Elements the WAI-ARIA APG dialog pattern treats as tab-stops for the focus trap. */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Returns the tab-stop elements inside a container, in DOM (tab) order.
 * @param container - The element to search within.
 * @returns The focusable descendants, in document order.
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
}

/**
 * Merges multiple refs (object or callback) into a single callback ref, so
 * an internal ref (needed for focus-trap bookkeeping) can coexist with the
 * consumer's own forwarded ref on the same DOM node.
 * @param refs - The refs to merge; `undefined`/`null` entries are skipped.
 * @returns A single callback ref that updates every merged ref.
 */
function mergeRefs<T>(...refs: Array<React.Ref<T> | undefined>): React.RefCallback<T> {
  return (node: T | null) => {
    for (const r of refs) {
      if (!r) continue
      if (typeof r === 'function') {
        r(node)
      } else {
        ;(r as React.MutableRefObject<T | null>).current = node
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Module-level open-modal stack. Every open <Modal> instance registers its
// own `useId()` here. Escape and the Tab focus-trap only act for the TOPMOST
// entry, so a confirm dialog stacked over a drawer doesn't let one Escape
// press close both (the user could never tell which action was cancelled).
// ---------------------------------------------------------------------------
const openModalStack: string[] = []

/** Pushes a modal instance onto the open-stack (it becomes the topmost). */
function pushModalStack(id: string): void {
  if (!openModalStack.includes(id)) openModalStack.push(id)
}

/** Removes a modal instance from the open-stack. */
function popModalStack(id: string): void {
  const index = openModalStack.indexOf(id)
  if (index !== -1) openModalStack.splice(index, 1)
}

/** Whether the given modal instance is currently the topmost of the stack. */
function isTopOfModalStack(id: string): boolean {
  return openModalStack.length > 0 && openModalStack[openModalStack.length - 1] === id
}

// ---------------------------------------------------------------------------
// Reference-counted body scroll lock. Two modals can be open at once (a
// drawer with a confirm dialog above it); without a shared counter, closing
// EITHER one reset `overflow` to '', silently unlocking page scroll behind
// the dialog that is still open.
// ---------------------------------------------------------------------------
let scrollLockCount = 0
let previousBodyOverflow = ''

/** Locks body scroll on the first caller; later callers just increment the count. */
function lockBodyScroll(): void {
  if (scrollLockCount === 0) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  scrollLockCount += 1
}

/** Decrements the lock count; restores the ORIGINAL overflow only once it reaches zero. */
function unlockBodyScroll(): void {
  scrollLockCount = Math.max(0, scrollLockCount - 1)
  if (scrollLockCount === 0) {
    document.body.style.overflow = previousBodyOverflow
  }
}

/**
 * Modal component.
 *
 * Renders into a `document.body` portal. Forwards any extra `data-*` or
 * `aria-*` props on the rest spread to the inner dialog `<div>` (e.g.
 * callers commonly pass `data-mol-id="some-modal"` for AI-agent / e2e
 * selectors).
 *
 * The internal close button always carries `data-mol-id="modal-close"`
 * as the molecule-convention default for the one fixed interactive
 * element inside the chrome.
 *
 * Implements the WAI-ARIA APG dialog (modal) pattern: on open, focus moves
 * to the first focusable element inside the dialog (or the dialog itself
 * when it has none); Tab/Shift+Tab are trapped inside the dialog; on close,
 * focus returns to whatever was focused before the dialog opened. Stacked
 * dialogs (a confirm above a drawer) each register on a module-level stack —
 * Escape and the Tab trap only act for the TOPMOST dialog, and the body
 * scroll lock is reference-counted so closing one of several open dialogs
 * never unlocks scroll behind the ones still open.
 */
export const Modal = forwardRef<HTMLDivElement, ModalProps & { 'data-mol-id'?: string }>(
  (
    {
      open,
      onClose,
      title,
      children,
      size = 'md',
      showCloseButton = true,
      closeOnOverlayClick = true,
      closeOnEscape = true,
      footer,
      centered = true,
      closeLabel,
      preventScroll = true,
      className,
      style,
      testId,
      ...rest
    },
    ref,
  ) => {
    const cm = getClassMap()
    // Per-instance title id AND stack key. A hardcoded 'modal-title'
    // duplicated the id whenever two modals were mounted (stacked dialogs, a
    // drawer + a confirm) — aria-labelledby then resolved to the FIRST
    // match, so screen readers announced the WRONG dialog title.
    const instanceId = useId()
    const titleId = instanceId

    const dialogRef = useRef<HTMLDivElement | null>(null)
    // Merges the internal focus-trap ref with the consumer's forwarded ref
    // onto the same dialog node, memoized so it isn't a fresh function
    // identity (and therefore a spurious detach/reattach) on every render.
    const setDialogRef = useMemo(() => mergeRefs<HTMLDivElement>(ref, dialogRef), [ref])
    // The element focused right before this dialog opened — restored on close.
    const previouslyFocusedRef = useRef<HTMLElement | null>(null)

    const handleOverlayClick = (e: React.MouseEvent): void => {
      if (closeOnOverlayClick && e.target === e.currentTarget) {
        onClose()
      }
    }

    // Effect A — stack registration + move focus INTO the dialog on open +
    // restore focus to whatever was focused before on close. Deps are
    // intentionally narrow ([open, instanceId] only): this must run exactly
    // once per open/close transition, NOT on every parent re-render that
    // hands down a fresh `onClose` closure — otherwise a busy parent would
    // silently steal focus back to the first control on every re-render,
    // even after the user had already tabbed further into the dialog.
    useEffect(() => {
      if (!open) return undefined

      previouslyFocusedRef.current = document.activeElement as HTMLElement | null
      pushModalStack(instanceId)

      const dialogEl = dialogRef.current
      if (dialogEl) {
        const focusables = getFocusableElements(dialogEl)
        ;(focusables[0] ?? dialogEl).focus()
      }

      return () => {
        popModalStack(instanceId)
        // Restore focus to whatever opened this dialog. Best-effort: if the
        // element was itself removed from the document while the dialog was
        // open, there is nothing sensible to restore focus to.
        const toRestore = previouslyFocusedRef.current
        if (toRestore && document.contains(toRestore)) {
          toRestore.focus()
        }
      }
    }, [open, instanceId])

    // Effect B — reference-counted body scroll lock, independent of focus
    // and Escape handling so it can react to `preventScroll` toggling on
    // its own.
    useEffect(() => {
      if (!open || !preventScroll) return undefined
      lockBodyScroll()
      return () => unlockBodyScroll()
    }, [open, preventScroll])

    // Effect C — Escape + Tab focus-trap. Re-subscribing when `onClose`
    // changes identity is safe (it only swaps which closure the listener
    // calls) and keeps the handler from ever closing over a stale `onClose`.
    useEffect(() => {
      if (!open) return undefined

      const handleKeyDown = (e: KeyboardEvent): void => {
        if (e.key === 'Escape') {
          if (closeOnEscape && isTopOfModalStack(instanceId)) {
            onClose()
          }
          return
        }

        if (e.key !== 'Tab' || !isTopOfModalStack(instanceId)) return

        const el = dialogRef.current
        if (!el) return
        const focusables = getFocusableElements(el)
        if (focusables.length === 0) {
          e.preventDefault()
          el.focus()
          return
        }

        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        const active = document.activeElement

        if (e.shiftKey) {
          if (active === first || !el.contains(active)) {
            e.preventDefault()
            last.focus()
          }
        } else if (active === last || !el.contains(active)) {
          e.preventDefault()
          first.focus()
        }
      }

      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }, [open, closeOnEscape, onClose, instanceId])

    if (!open) {
      return null
    }

    const passthrough: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(rest as Record<string, unknown>)) {
      if (k.startsWith('data-') || k.startsWith('aria-')) passthrough[k] = v
    }

    const closeButton = (closeClassName: string): React.ReactNode =>
      showCloseButton ? (
        <button
          type="button"
          onClick={onClose}
          className={closeClassName}
          data-mol-id="modal-close"
          aria-label={closeLabel ?? t('ui.modal.close', undefined, { defaultValue: 'Close' })}
        >
          {renderIcon('x-mark', cm.iconMd)}
        </button>
      ) : null

    // `centered` has no dedicated ClassMap resolver option (dialogWrapper is
    // a fixed token, not a `{ centered }`-parameterized one) — a top-anchored
    // layout is expressed as the one inline-style exception the workspace
    // styling rule allows for values ClassMap genuinely cannot express.
    // Long-term this belongs in UIClassMap (e.g. `dialogWrapper(opts?: {
    // centered?: boolean })`), which needs @molecule/app-ui + the ClassMap
    // bond, both outside this package.
    const wrapperStyle: React.CSSProperties | undefined = centered
      ? undefined
      : { alignItems: 'flex-start' }

    const modalContent = (
      <>
        {/* Overlay background */}
        <div className={cm.dialogOverlay} aria-hidden="true" />

        {/* Centering wrapper */}
        <div className={cm.dialogWrapper} style={wrapperStyle} onClick={handleOverlayClick}>
          {/* Content */}
          <div
            ref={setDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            className={cm.cn(cm.modal({ size }), className)}
            style={style}
            data-testid={testId}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            {...passthrough}
          >
            {/* With a title the close button shares the header row; without
                one it floats over the top-right corner — a title-less modal
                must not spend a full-width header band on just the X. */}
            {title ? (
              <div className={cm.dialogHeader}>
                <h2 id={titleId} className={cm.dialogTitle}>
                  {title as React.ReactNode}
                </h2>
                {closeButton(cm.dialogClose)}
              </div>
            ) : (
              closeButton(cm.dialogCloseFloating)
            )}

            <div className={cm.dialogBody}>{children as React.ReactNode}</div>

            {!!footer && <div className={cm.dialogFooter}>{footer as React.ReactNode}</div>}
          </div>
        </div>
      </>
    )

    // Render into portal
    if (typeof document !== 'undefined') {
      return createPortal(modalContent, document.body)
    }

    return modalContent
  },
)

Modal.displayName = 'Modal'
