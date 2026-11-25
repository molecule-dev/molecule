/**
 * Modal component.
 * @module
 */

import { Children, forwardRef, type ReactNode, useId, useMemo, useRef } from 'react'

import { useTranslation } from '@molecule/app-react'
import { slot } from '@molecule/app-react/render'
import type { ElementHandle, ModalProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Box, Pressable, ScrollArea, Text } from '@molecule/app-ui-react/elements'
import { OverlayBackdrop, OverlayPortal, useOverlayLayer } from '@molecule/app-ui-react/platform'

import { mergeRefs } from '../utilities/mergeRefs.js'
import { renderIcon } from '../utilities/renderIcon.js'
import { rootProps } from '../utilities/rootProps.js'

/** Checks a renderer-neutral slot with React while preserving the caller's node identity. */
function isReactNode(value: unknown): value is ReactNode {
  if (typeof value === 'function' || typeof value === 'symbol') return false
  if (value === null || typeof value !== 'object') return true
  // React will consume iterables and thenables itself. Inspecting them here could
  // consume a one-shot iterator or read pending content during render.
  if (Symbol.iterator in value && typeof value[Symbol.iterator] === 'function') return true
  if ('then' in value && typeof value.then === 'function') return true
  // The renderer recognizes its own opaque elements and portals and throws for plain objects.
  Children.count(value)
  return true
}

/**
 * A blocking dialog. The inner dialog receives the forwarded ref and caller attributes,
 * including overrides for `role`, `tabIndex` and `aria-labelledby`. The platform owns
 * the dialog's focus, dismissal order and scroll lock.
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
      footer: footerProp,
      centered = true,
      closeLabel,
      preventScroll = true,
      initialFocus,
      className,
      style,
      testId,
      ...rest
    },
    ref,
  ) => {
    const footer = open && isReactNode(footerProp) ? slot(footerProp) : undefined
    const { t } = useTranslation()
    const cm = getClassMap()
    const titleId = useId()
    const dialog = useRef<ElementHandle>(null)
    const setDialogRef = useMemo(() => mergeRefs<ElementHandle>(ref, dialog), [ref])
    const layer = useOverlayLayer({
      open,
      kind: 'modal',
      surface: dialog,
      dismissKey: closeOnEscape,
      dismissBackdrop: closeOnOverlayClick,
      focus: { trap: true, initial: initialFocus, restore: 'opener' },
      lockScroll: preventScroll,
      onDismiss: () => onClose(),
    })

    const closeButton = (closeClassName: string): ReactNode =>
      showCloseButton ? (
        <Pressable
          as="button"
          type="button"
          onClick={onClose}
          className={closeClassName}
          data-mol-id="modal-close"
          aria-label={closeLabel ?? t('ui.modal.close', undefined, { defaultValue: 'Close' })}
        >
          {renderIcon('x-mark', cm.iconMd)}
        </Pressable>
      ) : null

    return (
      <OverlayPortal layer={layer} presentation="host" server="inline">
        {open && (
          <>
            <Box as="div" className={cm.dialogOverlay} aria-hidden="true" />
            <OverlayBackdrop
              layer={layer}
              className={cm.dialogWrapper}
              style={centered ? undefined : { alignItems: 'flex-start' }}
              role="presentation"
            >
              <Box
                as="div"
                ref={setDialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? titleId : undefined}
                tabIndex={-1}
                className={cm.cn(cm.modal({ size }), className)}
                webStyle={style}
                data-testid={testId}
                {...rootProps(rest)}
              >
                {title ? (
                  <Box as="div" className={cm.dialogHeader}>
                    <Text as="h2" id={titleId} className={cm.dialogTitle}>
                      {title}
                    </Text>
                    {closeButton(cm.dialogClose)}
                  </Box>
                ) : (
                  closeButton(cm.dialogCloseFloating)
                )}

                <ScrollArea as="div" className={cm.dialogBody}>
                  {isReactNode(children) ? children : undefined}
                </ScrollArea>

                {!!footer && (
                  <Box as="div" className={cm.dialogFooter}>
                    {footer}
                  </Box>
                )}
              </Box>
            </OverlayBackdrop>
          </>
        )}
      </OverlayPortal>
    )
  },
)

Modal.displayName = 'Modal'
