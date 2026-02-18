/**
 * Modal component.
 *
 * @module
 */

import {
  type Component,
  createEffect,
  type JSX,
  onCleanup,
  Show,
  splitProps,
} from 'solid-js'
import { Portal } from 'solid-js/web'

import { t } from '@molecule/app-i18n'
import type { ModalProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { renderIcon } from '../utilities/renderIcon.js'

/**
 * Renders the Modal component.
 * @param props - The component props.
 * @returns The rendered modal JSX.
 */
export const Modal: Component<ModalProps> = (props) => {
  const [local] = splitProps(props, [
    'open',
    'onClose',
    'title',
    'children',
    'size',
    'showCloseButton',
    'closeLabel',
    'closeOnOverlayClick',
    'closeOnEscape',
    'footer',
    'centered',
    'preventScroll',
    'className',
    'style',
    'testId',
  ])

  const cm = getClassMap()
  const showCloseButton = (): boolean => local.showCloseButton ?? true
  const closeOnOverlayClick = (): boolean => local.closeOnOverlayClick ?? true
  const closeOnEscape = (): boolean => local.closeOnEscape ?? true
  const preventScroll = (): boolean => local.preventScroll ?? true

  const handleEscape = (e: KeyboardEvent): void => {
    if (closeOnEscape() && e.key === 'Escape') {
      local.onClose()
    }
  }

  const handleOverlayClick = (e: MouseEvent): void => {
    if (closeOnOverlayClick() && e.target === e.currentTarget) {
      local.onClose()
    }
  }

  createEffect(() => {
    if (local.open) {
      document.addEventListener('keydown', handleEscape)
      if (preventScroll()) {
        document.body.style.overflow = 'hidden'
      }
    } else {
      document.removeEventListener('keydown', handleEscape)
      if (preventScroll()) {
        document.body.style.overflow = ''
      }
    }
  })

  onCleanup(() => {
    document.removeEventListener('keydown', handleEscape)
    document.body.style.overflow = ''
  })

  return (
    <Show when={local.open}>
      <Portal>
        {/* Overlay background */}
        <div class={cm.dialogOverlay} aria-hidden="true" />

        {/* Centering wrapper */}
        <div
          class={cm.dialogWrapper}
          onClick={handleOverlayClick}
        >
          {/* Content */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={local.title ? 'modal-title' : undefined}
            class={cm.cn(cm.modal({ size: local.size }), local.className)}
            style={local.style}
            data-testid={local.testId}
            onClick={(e: MouseEvent) => e.stopPropagation()}
          >
          <Show when={local.title || showCloseButton()}>
            <div class={cm.dialogHeader}>
              <Show when={local.title} fallback={
                <Show when={showCloseButton()}>
                  <div></div>
                </Show>
              }>
                <h2 id="modal-title" class={cm.dialogTitle}>
                  {local.title}
                </h2>
              </Show>
              <Show when={showCloseButton()}>
                <button
                  type="button"
                  onClick={() => local.onClose()}
                  class={cm.dialogClose}
                  aria-label={local.closeLabel ?? t('ui.modal.close', undefined, { defaultValue: 'Close' })}
                >
                  {renderIcon('x-mark', cm.iconMd)}
                </button>
              </Show>
            </div>
          </Show>

          <div class={cm.dialogBody}>{local.children as JSX.Element}</div>

          <Show when={!!local.footer}>
            <div class={cm.dialogFooter}>{local.footer as JSX.Element}</div>
          </Show>
          </div>
        </div>
      </Portal>
    </Show>
  )
}
