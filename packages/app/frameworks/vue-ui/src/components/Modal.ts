/**
 * Vue Modal UI component with UIClassMap-driven styling.
 *
 * @module
 */

import {
  computed,
  defineComponent,
  h,
  inject,
  nextTick,
  onBeforeUnmount,
  type PropType,
  Teleport,
  type VNode,
  watchPostEffect,
} from 'vue'

import { OverlayLayer } from '@molecule/app-overlay-dom'
import type { ModalProps, ModalSize } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { toChildArray, useTranslation } from '@molecule/app-vue'

import { classOf, restAttrs, styleOf } from '../utilities/attrs.js'
import { useElementRef } from '../utilities/elementRef.js'
import { modalInitialFocus } from '../utilities/modal-focus.js'
import { renderIcon } from '../utilities/renderIcon.js'
import { setDisplayName } from './displayName.js'

/** Per-instance counter backing each Modal's unique title id. */
let nextModalInstanceId = 0

/**
 * Vue Modal UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s Modal. Renders into a
 * `document.body` Teleport. Every extra declared prop (id, aria-*, data-*,
 * automationId as data-mol-id, the DOM event handlers) falls through onto the
 * inner dialog `<div>`, exactly like React's `...rest` spread; a caller's
 * `role`, `tabIndex` or `aria-labelledby` replaces the dialog's default.
 *
 * The internal close button always carries `data-mol-id="modal-close"` as
 * the molecule-convention default for the one fixed interactive element
 * inside the chrome.
 *
 * Implements the WAI-ARIA APG dialog (modal) pattern: on open, focus moves
 * to the first focusable element inside the dialog (or the dialog itself
 * when it has none); Tab/Shift+Tab are trapped inside the dialog; on close,
 * focus returns to whatever was focused before the dialog opened. Stacked
 * dialogs (a confirm above a drawer) each register on the document stack —
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
  setup(props, { attrs, emit, slots, expose }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    // Each dialog names its own heading, including when another dialog is open.
    const instanceId = `mol-modal-${nextModalInstanceId++}`
    const titleId = instanceId

    // The dialog is React's `forwardRef` target; it holds `null` while closed.
    const dialogRef = useElementRef<HTMLDivElement>(expose)
    const initialFocus = inject(modalInitialFocus, undefined)
    // Vue mounts or hydrates the inline nodes before moving them to their own
    // document's body. Wait for the move before focusing a control.
    const portalTarget = computed(() => dialogRef.value?.ownerDocument.body ?? null)
    const layer = new OverlayLayer((focus, transition) => {
      if (transition === 'open') void nextTick(focus)
      else focus()
    })
    watchPostEffect(() => {
      layer.sync({
        open: props.open,
        kind: 'modal',
        surface: { current: dialogRef.value },
        dismissKey: props.closeOnEscape,
        dismissBackdrop: props.closeOnOverlayClick,
        focus: { trap: true, initial: initialFocus, restore: 'opener' },
        lockScroll: props.preventScroll,
        onDismiss: () => emit('close'),
      })
    })
    onBeforeUnmount(() => layer.release())

    const handleOverlayClick = (event: MouseEvent): void => {
      if (event.target === event.currentTarget) layer.dismissBackdrop()
      else event.stopPropagation()
    }

    return () => {
      if (!props.open) {
        return null
      }

      const title = props.title ?? slots.title?.()
      const footerNode = props.footer ?? slots.footer?.()
      const footer = toChildArray(footerNode).length > 0 ? footerNode : undefined

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
            role: 'presentation',
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
                // Every other declared prop reaches the dialog; a caller's role,
                // tabIndex or aria-labelledby replaces the default.
                ...restAttrs(attrs),
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

      // The server and first hydration pass render inline. Move the same nodes after mount.
      return h(
        Teleport,
        { to: portalTarget.value ?? 'body', disabled: !portalTarget.value },
        modalContent,
      )
    }
  },
})

setDisplayName(Modal, 'Modal')
