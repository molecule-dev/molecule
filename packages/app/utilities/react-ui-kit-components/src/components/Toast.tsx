/**
 * Toast component.
 *
 * @module
 */

import {
  forwardRef,
  type NamedExoticComponent,
  type RefAttributes,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import type { IconName } from '@molecule/app-icons'
import { useTranslation } from '@molecule/app-react'
import { slot, useCommittedRef } from '@molecule/app-react/render'
import type { ColorVariant, ElementHandle, ToastProps } from '@molecule/app-ui'
import { getClassMap, ToastCountdown } from '@molecule/app-ui'

import type { KitHosts } from '../hosts.js'
import { renderNode } from '../utilities/renderNode.js'
import { rootProps } from '../utilities/rootProps.js'

/**
 * Map status to toast variant.
 */
const statusVariantMap: Record<ColorVariant, 'default' | 'success' | 'warning' | 'error' | 'info'> =
  {
    primary: 'default',
    secondary: 'default',
    success: 'success',
    warning: 'warning',
    error: 'error',
    info: 'info',
  }

/**
 * Map toast status to icon name.
 */
const statusIconMap: Record<string, IconName> = {
  info: 'info-circle',
  success: 'check-circle',
  warning: 'exclamation-triangle',
  error: 'x-circle',
}

/**
 * Single Toast component.
 *
 * The auto-dismiss countdown pauses on hover AND focus (WCAG 2.2.1) and
 * resumes with whatever time was left — a slow reader or a keyboard/AT
 * user interacting with the toast never has it disappear mid-read. The
 * announced role follows `status`: `warning`/`error` get the assertive
 * `role="alert"`; every other status (`info`, `success`, the default) gets
 * the polite `role="status"` so routine confirmations don't interrupt a
 * screen reader mid-sentence the way an assertive announcement does.
 */
export function createToast(
  hosts: Pick<
    KitHosts,
    'Box' | 'Pressable' | 'ToastSurface' | 'animateToastExit' | 'focusStaysWithin' | 'renderIcon'
  >,
): NamedExoticComponent<ToastProps & RefAttributes<ElementHandle>> {
  const { Box, Pressable, ToastSurface, animateToastExit, focusStaysWithin, renderIcon } = hosts
  const Toast = forwardRef<ElementHandle, ToastProps>(
    (
      {
        children: childrenProp,
        title,
        description,
        status = 'info',
        duration = 5000,
        dismissible = true,
        onDismiss,
        position: _position = 'bottom-right',
        closeLabel,
        className,
        style,
        testId,
        onMouseEnter,
        onMouseLeave,
        onFocus,
        onBlur,
        ...rest
      },
      ref,
    ) => {
      const [isVisible, setIsVisible] = useState(true)
      const [closing, setClosing] = useState(false)
      const { t } = useTranslation()
      const cm = getClassMap()
      const variant = statusVariantMap[status] || 'default'
      const iconName = statusIconMap[variant]
      const statusIcon = iconName ? renderIcon(iconName, cm.iconMd) : null

      // Keep the latest onDismiss in a ref so the auto-dismiss timer depends
      // ONLY on `duration`. With onDismiss in the effect deps, every parent
      // re-render that recreates the callback (e.g. ToastProvider re-rendering
      // as new toasts arrive) restarted the countdown — a busy toast stack
      // never auto-dismissed.
      const onDismissRef = useRef(onDismiss)
      useCommittedRef(onDismissRef, onDismiss)

      const exited = useRef(false)
      const onExited = useCallback(() => {
        if (exited.current) return
        exited.current = true
        setIsVisible(false)
        onDismissRef.current?.()
      }, [])
      const [countdown] = useState(
        () =>
          new ToastCountdown(() => {
            if (animateToastExit) setClosing(true)
            else onExited()
          }),
      )
      useEffect(() => {
        countdown.start(duration)
        return countdown.stop
      }, [countdown, duration])

      if (!isVisible) return null
      const message = description || slot(renderNode(childrenProp))

      // Assertive announcement is appropriate for warnings/errors — an info or
      // success toast interrupting a screen-reader user mid-sentence for a
      // routine confirmation is the same over-announcing trap `role="alert"`
      // creates everywhere it's used for non-urgent content.
      const role = variant === 'warning' || variant === 'error' ? 'alert' : 'status'

      return (
        <ToastSurface
          closing={closing}
          onExited={onExited}
          accessibilityGroup={false}
          ref={ref}
          spokenContent={
            <>
              {title}
              {message}
            </>
          }
          role={role}
          data-state="open"
          className={cm.cn(cm.toast({ variant }), className)}
          webStyle={style}
          data-testid={testId}
          // Every other declared prop (id, aria-*, data-*, automationId as data-mol-id, the DOM
          // event handlers) reaches the root; a caller's role replaces the live-region default.
          {...rootProps(rest)}
          // The timer pauses while the pointer or focus is on the toast; the caller's handlers
          // for the same events run after it.
          onMouseEnter={(event) => {
            countdown.setPaused('hover', true)
            onMouseEnter?.(event)
          }}
          onMouseLeave={(event) => {
            countdown.setPaused('hover', false)
            onMouseLeave?.(event)
          }}
          onFocus={(event) => {
            countdown.setPaused('focus', true)
            onFocus?.(event)
          }}
          onBlur={(event) => {
            if (!focusStaysWithin(event)) countdown.setPaused('focus', false)
            onBlur?.(event)
          }}
        >
          {statusIcon && (
            <Box as="span" className={cm.toastIconWrapper}>
              {statusIcon}
            </Box>
          )}
          <Box as="div" className={cm.toastContentWrapper}>
            {title && (
              <Box as="div" className={cm.toastTitle}>
                {title}
              </Box>
            )}
            {!!message && (
              <Box as="div" className={cm.toastDescription}>
                {message}
              </Box>
            )}
          </Box>
          {dismissible && (
            <Pressable
              as="button"
              type="button"
              onClick={() => {
                if (animateToastExit) {
                  countdown.stop()
                  onExited()
                } else {
                  countdown.dismiss()
                }
              }}
              className={cm.toastClose}
              aria-label={closeLabel ?? t('ui.toast.close', undefined, { defaultValue: 'Close' })}
            >
              {renderIcon('x-mark', cm.iconSm)}
            </Pressable>
          )}
        </ToastSurface>
      )
    },
  )

  Toast.displayName = 'Toast'
  return Toast
}
