/**
 * Modal component.
 *
 * @module
 */

import React, { forwardRef, useCallback,useEffect } from 'react'
import { createPortal } from 'react-dom'

import { t } from '@molecule/app-i18n'
import type { ModalProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { renderIcon } from '../utilities/renderIcon.js'

/**
 * Modal component.
 */
export const Modal = forwardRef<HTMLDivElement, ModalProps>(
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
      centered: _centered = true,
      closeLabel,
      preventScroll = true,
      className,
      style,
      testId,
    },
    ref,
  ) => {
    const cm = getClassMap()

    const handleEscape = useCallback(
      (e: KeyboardEvent) => {
        if (closeOnEscape && e.key === 'Escape') {
          onClose()
        }
      },
      [closeOnEscape, onClose],
    )

    const handleOverlayClick = (e: React.MouseEvent): void => {
      if (closeOnOverlayClick && e.target === e.currentTarget) {
        onClose()
      }
    }

    useEffect(() => {
      if (open) {
        document.addEventListener('keydown', handleEscape)
        if (preventScroll) {
          document.body.style.overflow = 'hidden'
        }
      }

      return () => {
        document.removeEventListener('keydown', handleEscape)
        if (preventScroll) {
          document.body.style.overflow = ''
        }
      }
    }, [open, handleEscape, preventScroll])

    if (!open) {
      return null
    }

    const modalContent = (
      <>
        {/* Overlay background */}
        <div className={cm.dialogOverlay} aria-hidden="true" />

        {/* Centering wrapper */}
        <div
          className={cm.dialogWrapper}
          onClick={handleOverlayClick}
        >
          {/* Content */}
          <div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
            className={cm.cn(cm.modal({ size }), className)}
            style={style}
            data-testid={testId}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
          {(title || showCloseButton) && (
            <div className={cm.dialogHeader}>
              {title ? (
                <h2 id="modal-title" className={cm.dialogTitle}>
                  {title as React.ReactNode}
                </h2>
              ) : <div />}
              {showCloseButton && (
                <button type="button" onClick={onClose} className={cm.dialogClose} aria-label={closeLabel ?? t('ui.modal.close', undefined, { defaultValue: 'Close' })}>
                  {renderIcon('x-mark', cm.iconMd)}
                </button>
              )}
            </div>
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
