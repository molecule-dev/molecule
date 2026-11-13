/**
 * Modal component.
 *
 * @module
 */

import {
  type Component,
  createEffect,
  createUniqueId,
  type JSX,
  on,
  onCleanup,
  Show,
  splitProps,
} from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import type { ModalProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { toStyleProps } from '../utilities/dom.js'
import { BodyPortal } from '../utilities/portal.jsx'
import { renderIcon } from '../utilities/renderIcon.jsx'

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

// ---------------------------------------------------------------------------
// Module-level open-modal stack. Every open <Modal> instance registers its
// own generated id here. Escape and the Tab focus-trap only act for the
// TOPMOST entry, so a confirm dialog stacked over a drawer doesn't let one
// Escape press close both (the user could never tell which action was
// cancelled).
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
 * Renders the Modal component.
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
 *
 * @param props - The component props.
 * @returns The rendered modal JSX.
 */
export const Modal: Component<ModalProps & { 'data-mol-id'?: string }> = (props) => {
  const [local, rest] = splitProps(props, [
    'open',
    'onClose',
    'title',
    'children',
    'size',
    'showCloseButton',
    'closeOnOverlayClick',
    'closeOnEscape',
    'footer',
    'centered',
    'closeLabel',
    'preventScroll',
    'className',
    'style',
    'testId',
  ])

  const cm = getClassMap()
  const { t } = useTranslation()
  // Per-instance title id AND stack key. A hardcoded 'modal-title'
  // duplicated the id whenever two modals were mounted (stacked dialogs, a
  // drawer + a confirm) — aria-labelledby then resolved to the FIRST
  // match, so screen readers announced the WRONG dialog title.
  const instanceId = createUniqueId()
  const titleId = instanceId

  let dialogRef: HTMLDivElement | undefined
  // The element focused right before this dialog opened — restored on close.
  let previouslyFocused: HTMLElement | null = null

  const passthrough = (): Record<string, unknown> => {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(rest as Record<string, unknown>)) {
      if (k.startsWith('data-') || k.startsWith('aria-')) out[k] = v
    }
    return out
  }

  const handleOverlayClick = (e: MouseEvent & { currentTarget: HTMLDivElement }): void => {
    if ((local.closeOnOverlayClick ?? true) && e.target === e.currentTarget) {
      local.onClose()
    }
  }

  const handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') {
      if ((local.closeOnEscape ?? true) && isTopOfModalStack(instanceId)) {
        local.onClose()
      }
      return
    }

    if (e.key !== 'Tab' || !isTopOfModalStack(instanceId)) return

    const el = dialogRef
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

  // Stack registration and the Escape/Tab listener live on the open
  // transition exactly once (React's effects keyed on [open]); the focus
  // move itself is deferred one microtask, because this effect re-runs
  // BEFORE the Show above re-renders (creation order), and focus() on a
  // node that is not yet in the document is a silent no-op.
  createEffect(
    on(
      () => !!local.open,
      (open) => {
        if (!open) return
        previouslyFocused = document.activeElement as HTMLElement | null
        pushModalStack(instanceId)
        document.addEventListener('keydown', handleKeyDown)
        queueMicrotask(() => {
          const dialogEl = dialogRef
          if (!dialogEl) return
          const focusables = getFocusableElements(dialogEl)
          ;(focusables[0] ?? dialogEl).focus()
        })
        onCleanup(() => {
          popModalStack(instanceId)
          document.removeEventListener('keydown', handleKeyDown)
          // Restore focus to whatever opened this dialog. Best-effort: if the
          // element was itself removed from the document while the dialog was
          // open, there is nothing sensible to restore focus to.
          const toRestore = previouslyFocused
          if (toRestore && document.contains(toRestore)) {
            toRestore.focus()
          }
        })
      },
    ),
  )

  // Reference-counted body scroll lock, separate from focus and Escape
  // handling so it can react to `preventScroll` toggling on its own.
  createEffect(
    on(
      () => !!local.open && (local.preventScroll ?? true),
      (active) => {
        if (!active) return
        lockBodyScroll()
        onCleanup(() => unlockBodyScroll())
      },
    ),
  )

  const setDialogRef = (el: HTMLDivElement): void => {
    dialogRef = el
  }

  /**
   * Forwards the close button's click to `onClose`. The core type declares no
   * parameters, but the reference wires it as the click handler, so it
   * receives the event.
   *
   * @param event - The close button's click event.
   */
  const handleCloseClick = (event: MouseEvent): void => {
    const onClose = local.onClose as (event: MouseEvent) => void
    onClose(event)
  }

  const closeButton = (closeClassName: string): JSX.Element | null =>
    (local.showCloseButton ?? true) ? (
      <button
        type="button"
        onClick={handleCloseClick}
        class={closeClassName}
        data-mol-id="modal-close"
        aria-label={local.closeLabel ?? t('ui.modal.close', undefined, { defaultValue: 'Close' })}
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
  const wrapperStyle = (): JSX.CSSProperties | undefined =>
    (local.centered ?? true) ? undefined : { 'align-items': 'flex-start' }

  return (
    <Show when={local.open}>
      <BodyPortal>
        {/* Overlay background */}
        <div class={cm.dialogOverlay} aria-hidden="true" />

        {/* Centering wrapper */}
        <div
          class={cm.dialogWrapper}
          style={toStyleProps(wrapperStyle())}
          onClick={handleOverlayClick}
        >
          {/* Content */}
          <div
            ref={setDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={local.title ? titleId : undefined}
            tabindex={-1}
            class={cm.cn(cm.modal({ size: local.size ?? 'md' }), local.className)}
            style={toStyleProps(local.style)}
            data-testid={local.testId}
            onClick={(e: MouseEvent) => e.stopPropagation()}
            {...passthrough()}
          >
            {/* With a title the close button shares the header row; without
                one it floats over the top-right corner — a title-less modal
                must not spend a full-width header band on just the X. */}
            <Show when={local.title} fallback={closeButton(cm.dialogCloseFloating)}>
              <div class={cm.dialogHeader}>
                <h2 id={titleId} class={cm.dialogTitle}>
                  {local.title as JSX.Element}
                </h2>
                {closeButton(cm.dialogClose)}
              </div>
            </Show>

            <div class={cm.dialogBody}>{local.children as JSX.Element}</div>

            <Show when={local.footer}>
              <div class={cm.dialogFooter}>{local.footer as JSX.Element}</div>
            </Show>
          </div>
        </div>
      </BodyPortal>
    </Show>
  )
}
