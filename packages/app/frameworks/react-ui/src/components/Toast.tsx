/**
 * Toast component.
 *
 * @module
 */

import {
  createContext,
  type FC,
  forwardRef,
  type NamedExoticComponent,
  type ReactNode,
  type RefAttributes,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import type { IconName } from '@molecule/app-icons'
import { useTranslation } from '@molecule/app-react'
import { slot, useCommittedRef } from '@molecule/app-react/render'
import type { ColorVariant, ElementHandle, ToastProps as WebToastProps } from '@molecule/app-ui'
import { getClassMap, ToastCountdown } from '@molecule/app-ui'
import { Box, Pressable } from '@molecule/app-ui-react/elements'
import {
  focusStaysWithin,
  OverlayPortal,
  ToastMessage,
  useOverlayLayer,
} from '@molecule/app-ui-react/platform'

import type { ToastProps } from '../types.js'
import { isReactNode } from '../utilities/isReactNode.js'
import { mergeRefs } from '../utilities/mergeRefs.js'
import { renderIcon } from '../utilities/renderIcon.js'
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
export const Toast: NamedExoticComponent<WebToastProps & RefAttributes<ElementHandle>> = forwardRef<
  ElementHandle,
  WebToastProps
>(
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

    const [countdown] = useState(
      () =>
        new ToastCountdown(() => {
          setIsVisible(false)
          onDismissRef.current?.()
        }),
    )
    useEffect(() => {
      countdown.start(duration)
      return countdown.stop
    }, [countdown, duration])

    if (!isVisible) return null
    const message = description || (isReactNode(childrenProp) ? slot(childrenProp) : undefined)

    // Assertive announcement is appropriate for warnings/errors — an info or
    // success toast interrupting a screen-reader user mid-sentence for a
    // routine confirmation is the same over-announcing trap `role="alert"`
    // creates everywhere it's used for non-urgent content.
    const role = variant === 'warning' || variant === 'error' ? 'alert' : 'status'

    return (
      <ToastMessage
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
            onClick={countdown.dismiss}
            className={cm.toastClose}
            aria-label={closeLabel ?? t('ui.toast.close', undefined, { defaultValue: 'Close' })}
          >
            {renderIcon('x-mark', cm.iconSm)}
          </Pressable>
        )}
      </ToastMessage>
    )
  },
)

Toast.displayName = 'Toast'

/**
 * Toast container for positioning toasts.
 */
export interface ToastContainerProps {
  children?: ReactNode
  position?: ToastProps['position']
  className?: string
}

// positionClasses removed — use cm.toastContainer({ position }) instead

/**
 * Container that positions toasts on screen via a portal.
 * @returns The rendered toast container element.
 */
export const ToastContainer: NamedExoticComponent<
  ToastContainerProps & RefAttributes<ElementHandle>
> = forwardRef<ElementHandle, ToastContainerProps>(
  ({ children, position = 'bottom-right', className }, ref) => {
    const cm = getClassMap()

    const surface = useRef<ElementHandle>(null)
    const setSurface = useMemo(() => mergeRefs(ref, surface), [ref])
    const layer = useOverlayLayer({ open: true, kind: 'toast', surface })

    return (
      <OverlayPortal layer={layer} presentation="host" server="omit">
        <Box
          as="div"
          ref={setSurface}
          className={cm.cn(cm.toastContainer({ position }), className)}
        >
          {children}
        </Box>
      </OverlayPortal>
    )
  },
)

ToastContainer.displayName = 'ToastContainer'

/**
 * Toast context for managing toasts globally.
 */
export interface ToastContextValue<Payload, Input = Payload> {
  toasts: (Payload & { id: string })[]
  addToast: (toast: Omit<Input, 'onDismiss'>) => string
  removeToast: (id: string) => void
}

type SharedToastContext = ToastContextValue<ToastProps, WebToastProps>

const ToastContext = createContext<SharedToastContext | null>(null)

/**
 * Hook to access the toast context for adding and removing toasts.
 * @returns The toast context value with toast management methods.
 */
export const useToast = (): SharedToastContext => {
  const { t } = useTranslation()
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error(
      t('react.error.useToastOutsideProvider', undefined, {
        defaultValue: 'useToast must be used within a ToastProvider',
      }),
    )
  }
  return context
}

interface ToastProviderProps {
  children: ReactNode
  position?: ToastProps['position']
}

let toastCounter = 0

/**
 * Provider component that manages global toast state.
 * @param root0 - The component props.
 * @param root0.children - The child elements to render within the provider.
 * @param root0.position - The default position for toasts.
 * @returns The rendered provider with toast container.
 */
export const ToastProvider: FC<ToastProviderProps> = ({ children, position = 'bottom-right' }) => {
  const [toasts, setToasts] = useState<(ToastProps & { id: string })[]>([])

  const addToast = useCallback((toast: Omit<WebToastProps, 'onDismiss'>) => {
    // A caller's `id` is the toast's handle and its element id; otherwise one is generated.
    const id = toast.id ?? `toast-${++toastCounter}`
    const { children } = toast
    const entry: ToastProps & { id: string } = {
      ...toast,
      children: isReactNode(children) ? children : undefined,
      id,
    }
    if (!Object.hasOwn(toast, 'children')) delete entry.children
    setToasts((prev) => [...prev, entry])
    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer position={position}>
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onDismiss={() => removeToast(toast.id)} />
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  )
}
