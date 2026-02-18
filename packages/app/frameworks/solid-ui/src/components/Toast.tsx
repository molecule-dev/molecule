/**
 * Toast component.
 *
 * @module
 */

import {
  type Component,
  createContext,
  createEffect,
  createSignal,
  For,
  type JSX,
  onCleanup,
  Show,
  splitProps,
  useContext,
} from 'solid-js'
import { Portal } from 'solid-js/web'

import { t } from '@molecule/app-i18n'
import type { ColorVariant,ToastProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { renderIcon } from '../utilities/renderIcon.js'

const statusVariantMap: Record<ColorVariant, 'default' | 'success' | 'warning' | 'error' | 'info'> =
  {
    primary: 'default',
    secondary: 'default',
    success: 'success',
    warning: 'warning',
    error: 'error',
    info: 'info',
  }

const statusIconMap: Record<string, string> = {
  info: 'info-circle',
  success: 'check-circle',
  warning: 'exclamation-triangle',
  error: 'x-circle',
}


/**
 * Single Toast component.
 * @param props - The component props.
 * @returns The rendered component element.
 */
export const Toast: Component<ToastProps> = (props) => {
  const [local] = splitProps(props, [
    'children',
    'title',
    'description',
    'status',
    'duration',
    'dismissible',
    'closeLabel',
    'onDismiss',
    'position',
    'className',
    'style',
    'testId',
  ])

  const cm = getClassMap()
  const [isVisible, setIsVisible] = createSignal(true)
  const variant = (): 'default' | 'success' | 'warning' | 'error' | 'info' => statusVariantMap[local.status || 'info'] || 'default'
  const iconName = (): string | undefined => statusIconMap[variant()]
  const duration = (): number => local.duration ?? 5000
  const dismissible = (): boolean => local.dismissible ?? true

  createEffect(() => {
    if (duration() > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false)
        local.onDismiss?.()
      }, duration())
      onCleanup(() => clearTimeout(timer))
    }
  })

  const handleDismiss = (): void => {
    setIsVisible(false)
    local.onDismiss?.()
  }

  return (
    <Show when={isVisible()}>
      <div
        role="alert"
        data-state="open"
        class={cm.cn(cm.toast({ variant: variant() }), local.className)}
        style={local.style}
        data-testid={local.testId}
      >
        <Show when={iconName()}>
          <span class={cm.toastIconWrapper}>
            {renderIcon(iconName()!, cm.iconMd)}
          </span>
        </Show>
        <div class={cm.toastContentWrapper}>
          <Show when={local.title}>
            <div class={cm.toastTitle}>{local.title}</div>
          </Show>
          <Show when={!!(local.description || local.children)}>
            <div class={cm.toastDescription}>
              {(local.description as JSX.Element) || (local.children as JSX.Element)}
            </div>
          </Show>
        </div>
        <Show when={dismissible()}>
          <button
            type="button"
            onClick={handleDismiss}
            class={cm.toastClose}
            aria-label={local.closeLabel ?? t('ui.toast.close', undefined, { defaultValue: 'Close' })}
          >
            {renderIcon('x-mark', cm.iconSm)}
          </button>
        </Show>
      </div>
    </Show>
  )
}

/**
 * Toast container for positioning toasts.
 * @param props - The component props.
 * @returns The rendered component element.
 */
export const ToastContainer: Component<{
  children?: JSX.Element
  position?: ToastProps['position']
  class?: string
}> = (props) => {
  const cm = getClassMap()
  const position = (): NonNullable<ToastProps['position']> => props.position || 'bottom-right'

  return (
    <Portal>
      <div
        class={cm.cn(
          cm.toastContainer({ position: position() }),
          props.class,
        )}
      >
        {props.children}
      </div>
    </Portal>
  )
}

/**
 * Toast context for managing toasts globally.
 */
interface ToastContextValue {
  toasts: () => (ToastProps & { id: string })[]
  addToast: (toast: Omit<ToastProps, 'onDismiss'>) => string
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue>()

/**
 * Hook to access the toast context for adding and removing toasts.
 * @returns The toast context value with toast management methods.
 */
export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error(t('solid.error.useToastOutsideProvider', undefined, { defaultValue: 'useToast must be used within a ToastProvider' }))
  }
  return context
}

let toastCounter = 0

/**
 * Provider component that manages global toast state.
 * @param props - The component props.
 * @returns The rendered provider with toast container.
 */
export const ToastProvider: Component<{
  children: JSX.Element
  position?: ToastProps['position']
}> = (props) => {
  const [toasts, setToasts] = createSignal<(ToastProps & { id: string })[]>([])
  const position = (): NonNullable<ToastProps['position']> => props.position || 'bottom-right'

  const addToast = (toast: Omit<ToastProps, 'onDismiss'>): string => {
    const id = `toast-${++toastCounter}`
    setToasts((prev) => [...prev, { ...toast, id }])
    return id
  }

  const removeToast = (id: string): void => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {props.children}
      <ToastContainer position={position()}>
        <For each={toasts()}>
          {(toast) => <Toast {...toast} onDismiss={() => removeToast(toast.id)} />}
        </For>
      </ToastContainer>
    </ToastContext.Provider>
  )
}
