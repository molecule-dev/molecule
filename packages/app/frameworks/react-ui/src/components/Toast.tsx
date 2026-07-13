/**
 * Toast component.
 *
 * @module
 */

import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

import { t } from '@molecule/app-i18n'
import type { IconName } from '@molecule/app-icons'
import type { ColorVariant, ToastProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { renderIcon } from '../utilities/renderIcon.js'

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
export const Toast = forwardRef<HTMLDivElement, ToastProps>(
  (
    {
      children,
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
    },
    ref,
  ) => {
    const [isVisible, setIsVisible] = useState(true)
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
    useEffect(() => {
      onDismissRef.current = onDismiss
    }, [onDismiss])

    // WCAG 2.2.1 (Timing Adjustable): a countdown a slow reader or AT user
    // cannot pause loses the message mid-read. `remainingRef` carries the
    // time left across pause/resume cycles (hover in/out, focus in/out)
    // instead of a fixed deadline.
    const remainingRef = useRef(duration)
    const startedAtRef = useRef<number | null>(null)
    const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

    const clearTimer = useCallback(() => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = undefined
      }
      startedAtRef.current = null
    }, [])

    const startTimer = useCallback(
      (ms: number) => {
        clearTimer()
        if (ms <= 0) return
        startedAtRef.current = Date.now()
        timerRef.current = setTimeout(() => {
          setIsVisible(false)
          onDismissRef.current?.()
        }, ms)
      },
      [clearTimer],
    )

    const pauseTimer = useCallback(() => {
      if (startedAtRef.current === null) return
      const elapsed = Date.now() - startedAtRef.current
      remainingRef.current = Math.max(0, remainingRef.current - elapsed)
      clearTimer()
    }, [clearTimer])

    const resumeTimer = useCallback(() => {
      if (remainingRef.current > 0) startTimer(remainingRef.current)
    }, [startTimer])

    useEffect(() => {
      remainingRef.current = duration
      startTimer(duration)
      return () => clearTimer()
    }, [duration, startTimer, clearTimer])

    const handleDismiss = useCallback(() => {
      setIsVisible(false)
      onDismiss?.()
    }, [onDismiss])

    if (!isVisible) return null

    // Assertive announcement is appropriate for warnings/errors — an info or
    // success toast interrupting a screen-reader user mid-sentence for a
    // routine confirmation is the same over-announcing trap `role="alert"`
    // creates everywhere it's used for non-urgent content.
    const role = variant === 'warning' || variant === 'error' ? 'alert' : 'status'

    return (
      <div
        ref={ref}
        role={role}
        data-state="open"
        className={cm.cn(cm.toast({ variant }), className)}
        style={style}
        data-testid={testId}
        onMouseEnter={pauseTimer}
        onMouseLeave={resumeTimer}
        onFocus={pauseTimer}
        onBlur={resumeTimer}
      >
        {statusIcon && <span className={cm.toastIconWrapper}>{statusIcon}</span>}
        <div className={cm.toastContentWrapper}>
          {title && <div className={cm.toastTitle}>{title}</div>}
          {!!(description || children) && (
            <div className={cm.toastDescription}>
              {(description as React.ReactNode) || (children as React.ReactNode)}
            </div>
          )}
        </div>
        {dismissible && (
          <button
            type="button"
            onClick={handleDismiss}
            className={cm.toastClose}
            aria-label={closeLabel ?? t('ui.toast.close', undefined, { defaultValue: 'Close' })}
          >
            {renderIcon('x-mark', cm.iconSm)}
          </button>
        )}
      </div>
    )
  },
)

Toast.displayName = 'Toast'

/**
 * Toast container for positioning toasts.
 */
interface ToastContainerProps {
  children?: React.ReactNode
  position?: ToastProps['position']
  className?: string
}

// positionClasses removed — use cm.toastContainer({ position }) instead

/**
 * Container that positions toasts on screen via a portal.
 * @returns The rendered toast container element.
 */
export const ToastContainer = forwardRef<HTMLDivElement, ToastContainerProps>(
  ({ children, position = 'bottom-right', className }, ref) => {
    const cm = getClassMap()

    const container = (
      <div ref={ref} className={cm.cn(cm.toastContainer({ position }), className)}>
        {children}
      </div>
    )

    if (typeof document === 'undefined') return null
    return createPortal(container, document.body)
  },
)

ToastContainer.displayName = 'ToastContainer'

/**
 * Toast context for managing toasts globally.
 */
interface ToastContextValue {
  toasts: (ToastProps & { id: string })[]
  addToast: (toast: Omit<ToastProps, 'onDismiss'>) => string
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

/**
 * Hook to access the toast context for adding and removing toasts.
 * @returns The toast context value with toast management methods.
 */
export const useToast = (): ToastContextValue => {
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
  children: React.ReactNode
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
export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  position = 'bottom-right',
}) => {
  const [toasts, setToasts] = useState<(ToastProps & { id: string })[]>([])

  const addToast = useCallback((toast: Omit<ToastProps, 'onDismiss'>) => {
    const id = `toast-${++toastCounter}`
    setToasts((prev) => [...prev, { ...toast, id }])
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
