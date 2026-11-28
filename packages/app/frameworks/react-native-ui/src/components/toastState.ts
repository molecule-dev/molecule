/**
 * The notification queue of a ToastProvider and the hook that reaches it: what the device and the
 * web tree of the provider both manage.
 *
 * @module
 */

import { createContext, useCallback, useContext, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import type { ToastProps } from '@molecule/app-ui'

/** A notification the provider shows. */
export interface ToastItem {
  id: number
  props: ToastProps
}

/** What `useToast()` returns: add a notification by its props, dismiss one by its id. */
export interface ToastContextValue {
  toast: (props: Omit<ToastProps, 'onDismiss'>) => number
  dismiss: (id: number) => void
}

/** The queue of the nearest ToastProvider; `useToast()` throws outside one. */
export const ToastContext = createContext<ToastContextValue | null>(null)

let toastCounter = 0

/**
 * Holds the provider's notifications and the handlers that add and remove one.
 *
 * @returns The notifications, and the `toast` and `dismiss` handlers for the context.
 */
export function useToastQueue(): ToastContextValue & { toasts: ToastItem[] } {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback((props: Omit<ToastProps, 'onDismiss'>) => {
    const id = ++toastCounter
    setToasts((prev) => [...prev, { id, props }])
    return id
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { toasts, toast, dismiss }
}

/**
 * Reads the nearest ToastProvider's queue.
 *
 * @returns The context value with toast management methods.
 */
export function useToast(): ToastContextValue {
  const { t } = useTranslation()
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error(
      t('ui.toast.error.noProvider', undefined, {
        defaultValue: '`useToast` must be used within a `ToastProvider`',
      }),
    )
  }
  return context
}
