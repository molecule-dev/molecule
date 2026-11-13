/**
 * Vue Modal UI component with UIClassMap-driven styling.
 *
 * @module
 */

import {
  defineComponent,
  h,
  onMounted,
  onUnmounted,
  type PropType,
  ref,
  Teleport,
  type VNode,
  watch,
} from 'vue'

import { t } from '@molecule/app-i18n'
import type { ModalProps, ModalSize } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { classOf, restAttrs, styleOf } from '../utilities/attrs.js'
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

// ---------------------------------------------------------------------------
// Module-level open-modal stack. Every open <Modal> instance registers its
// own instance id here. Escape and the Tab focus-trap only act for the
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

/** Per-instance counter backing each Modal's unique title/stack id. */
let nextModalInstanceId = 0

/**
 * Vue Modal UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s Modal. Renders into a
 * `document.body` Teleport. Any extra `data-*` or `aria-*` attributes fall
 * through onto the inner dialog `<div>` (e.g. callers commonly pass
 * `data-mol-id="some-modal"` for AI-agent / e2e selectors); every other
 * fallthrough attribute is dropped, exactly like the React `...rest` filter.
 *
 * The internal close button always carries `data-mol-id="modal-close"` as
 * the molecule-convention default for the one fixed interactive element
 * inside the chrome.
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
export const Modal = defineComponent({
  name: 'MModal',
  inheritAttrs: false,
  props: {
    open: {
      type: Boolean,
      required: true,
    },
    title: String,
    size: {
      type: String as PropType<ModalSize>,
      default: 'md',
    },
    showCloseButton: {
      type: Boolean,
      default: true,
    },
    closeOnOverlayClick: {
      type: Boolean,
      default: true,
    },
    closeOnEscape: {
      type: Boolean,
      default: true,
    },
    footer: null,
    centered: {
      type: Boolean,
      default: true,
    },
    preventScroll: {
      type: Boolean,
      default: true,
    },
    closeLabel: String,
    className: String,
    style: [String, Object] as PropType<ModalProps['style']>,
    testId: String,
  },
  emits: ['close'],
  setup(props, { attrs, emit, slots }) {
    const cm = getClassMap()
    // Per-instance title id AND stack key. A hardcoded 'modal-title'
    // duplicated the id whenever two modals were mounted (stacked dialogs, a
    // drawer + a confirm) — aria-labelledby then resolved to the FIRST
    // match, so screen readers announced the WRONG dialog title.
    const instanceId = `mol-modal-${nextModalInstanceId++}`
    const titleId = instanceId

    const dialogRef = ref<HTMLElement | null>(null)
    // The element focused right before this dialog opened — restored on close.
    const previouslyFocused: { current: HTMLElement | null } = { current: null }
    // Whether the open-side bookkeeping (stack entry, keydown listener,
    // scroll lock) currently applies to this instance.
    let openBookkeeping = false
    let scrollLocked = false

    const handleOverlayClick = (e: MouseEvent): void => {
      if (props.closeOnOverlayClick && e.target === e.currentTarget) {
        emit('close')
      }
    }

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        if (props.closeOnEscape && isTopOfModalStack(instanceId)) {
          emit('close')
        }
        return
      }

      if (e.key !== 'Tab' || !isTopOfModalStack(instanceId)) return

      const el = dialogRef.value
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

    /**
     * Opens the dialog bookkeeping: saves the previously focused element,
     * registers on the stack, moves focus into the dialog and subscribes the
     * document keydown handler. Runs after the DOM update (React effect A +
     * C run after commit), so the teleported dialog exists when focused.
     */
    const beginOpenBookkeeping = (): void => {
      if (openBookkeeping) return
      openBookkeeping = true
      previouslyFocused.current = document.activeElement as HTMLElement | null
      pushModalStack(instanceId)

      const dialogEl = dialogRef.value
      if (dialogEl) {
        const focusables = getFocusableElements(dialogEl)
        ;(focusables[0] ?? dialogEl).focus()
      }

      document.addEventListener('keydown', handleKeyDown)
    }

    /**
     * Closes the dialog bookkeeping: pops the stack, unsubscribes the
     * keydown handler and restores focus to whatever opened the dialog.
     * Best-effort: if that element was itself removed from the document
     * while the dialog was open, there is nothing sensible to restore to.
     */
    const endOpenBookkeeping = (): void => {
      if (!openBookkeeping) return
      openBookkeeping = false
      popModalStack(instanceId)
      document.removeEventListener('keydown', handleKeyDown)
      const toRestore = previouslyFocused.current
      if (toRestore && document.contains(toRestore)) {
        toRestore.focus()
      }
    }

    // Effect A + C — move focus into the dialog on open and restore focus on
    // close (post-flush: after the teleported dialog has been patched in/out,
    // like React's commit-then-effect ordering). Runs exactly once per
    // open/close transition, NOT on every parent re-render that hands down a
    // fresh `onClose` closure.
    watch(
      () => props.open,
      (open) => {
        if (open) beginOpenBookkeeping()
        else endOpenBookkeeping()
      },
      { flush: 'post' },
    )

    // Effect B — reference-counted body scroll lock, independent of focus
    // and Escape handling so it can react to `preventScroll` toggling on
    // its own.
    watch(
      (): [boolean, boolean] => [props.open, props.preventScroll],
      ([open, preventScroll]) => {
        if (open && preventScroll && !scrollLocked) {
          lockBodyScroll()
          scrollLocked = true
        } else if (scrollLocked && !(open && preventScroll)) {
          unlockBodyScroll()
          scrollLocked = false
        }
      },
      { flush: 'post' },
    )

    onMounted(() => {
      if (props.open) beginOpenBookkeeping()
      if (props.open && props.preventScroll) {
        lockBodyScroll()
        scrollLocked = true
      }
    })

    onUnmounted(() => {
      endOpenBookkeeping()
      if (scrollLocked) {
        unlockBodyScroll()
        scrollLocked = false
      }
    })

    return () => {
      if (!props.open) {
        return null
      }

      const title = props.title ?? slots.title?.()
      const footer = props.footer ?? slots.footer?.()

      const passthrough: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(restAttrs(attrs))) {
        if (k.startsWith('data-') || k.startsWith('aria-')) passthrough[k] = v
      }

      const closeButton = (closeClassName: string): VNode | null =>
        props.showCloseButton
          ? h(
              'button',
              {
                type: 'button',
                onClick: (event: MouseEvent) => emit('close', event),
                class: closeClassName,
                'data-mol-id': 'modal-close',
                'aria-label':
                  props.closeLabel ?? t('ui.modal.close', undefined, { defaultValue: 'Close' }),
              },
              [renderIcon('x-mark', cm.iconMd)],
            )
          : null

      // `centered` has no dedicated ClassMap resolver option (dialogWrapper is
      // a fixed token, not a `{ centered }`-parameterized one) — a top-anchored
      // layout is expressed as the one inline-style exception the workspace
      // styling rule allows for values ClassMap genuinely cannot express.
      const wrapperStyle = props.centered ? undefined : { alignItems: 'flex-start' }

      const modalContent = [
        // Overlay background
        h('div', {
          class: cm.dialogOverlay,
          'aria-hidden': 'true',
        }),
        // Centering wrapper
        h(
          'div',
          {
            class: cm.dialogWrapper,
            style: wrapperStyle,
            onClick: handleOverlayClick,
          },
          [
            // Content
            h(
              'div',
              {
                ref: dialogRef,
                role: 'dialog',
                'aria-modal': 'true',
                'aria-labelledby': title ? titleId : undefined,
                tabindex: -1,
                class: cm.cn(cm.modal({ size: props.size }), ...classOf(props.className, attrs)),
                style: styleOf(props.style, attrs),
                'data-testid': props.testId,
                onClick: (e: MouseEvent) => e.stopPropagation(),
                ...passthrough,
              },
              [
                // With a title the close button shares the header row; without
                // one it floats over the top-right corner — a title-less modal
                // must not spend a full-width header band on just the X.
                title
                  ? h('div', { class: cm.dialogHeader }, [
                      h('h2', { id: titleId, class: cm.dialogTitle }, title),
                      closeButton(cm.dialogClose),
                    ])
                  : closeButton(cm.dialogCloseFloating),
                h('div', { class: cm.dialogBody }, slots.default?.()),
                !!footer && h('div', { class: cm.dialogFooter }, footer),
              ],
            ),
          ],
        ),
      ]

      // Render into a body portal.
      return h(Teleport, { to: 'body' }, modalContent)
    }
  },
})
