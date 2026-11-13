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
  on,
  onCleanup,
  Show,
  splitProps,
  useContext,
} from 'solid-js'

import { t } from '@molecule/app-i18n'
import type { IconName } from '@molecule/app-icons'
import type { ColorVariant, ToastProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { toStyleProps } from '../utilities/dom.js'
import { BodyPortal } from '../utilities/portal.jsx'
import { renderIcon } from '../utilities/renderIcon.jsx'

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
 * Renders a single Toast component.
 *
 * The auto-dismiss countdown pauses on hover AND focus (WCAG 2.2.1) and
 * resumes with whatever time was left — a slow reader or a keyboard/AT
 * user interacting with the toast never has it disappear mid-read. The
 * announced role follows `status`: `warning`/`error` get the assertive
 * `role="alert"`; every other status (`info`, `success`, the default) gets
 * the polite `role="status"` so routine confirmations don't interrupt a
 * screen reader mid-sentence the way an assertive announcement does.
 *
 * @param props - The component props.
 * @returns The rendered toast JSX.
 */
export const Toast: Component<ToastProps> = (props) => {
  const [local] = splitProps(props, [
    'children',
    'title',
    'description',
    'status',
    'duration',
    'dismissible',
    'position',
    'closeLabel',
    'className',
    'style',
    'testId',
    'onDismiss',
  ])

  const [isVisible, setIsVisible] = createSignal(true)
  const cm = getClassMap()
  const status = (): NonNullable<ToastProps['status']> => local.status ?? 'info'
  const variant = (): 'default' | 'success' | 'warning' | 'error' | 'info' =>
    statusVariantMap[status()] || 'default'
  const iconName = (): IconName | undefined => statusIconMap[variant()]
  const statusIcon = (): JSX.Element | null => {
    const name = iconName()
    return name ? renderIcon(name, cm.iconMd) : null
  }

  // WCAG 2.2.1 (Timing Adjustable): a countdown a slow reader or AT user
  // cannot pause loses the message mid-read. `remaining` carries the time
  // left across pause/resume cycles (hover in/out, focus in/out) instead
  // of a fixed deadline. The dismiss callback is read at fire time so the
  // countdown depends ONLY on `duration` — a parent re-render that
  // recreates the callback must not restart it.
  let remaining: number = local.duration ?? 5000
  let startedAt: number | null = null
  let timer: ReturnType<typeof setTimeout> | undefined

  const clearTimer = (): void => {
    if (timer) {
      clearTimeout(timer)
      timer = undefined
    }
    startedAt = null
  }

  const startTimer = (ms: number): void => {
    clearTimer()
    if (ms <= 0) return
    startedAt = Date.now()
    timer = setTimeout(() => {
      setIsVisible(false)
      local.onDismiss?.()
    }, ms)
  }

  const pauseTimer = (): void => {
    if (startedAt === null) return
    const elapsed = Date.now() - startedAt
    remaining = Math.max(0, remaining - elapsed)
    clearTimer()
  }

  const resumeTimer = (): void => {
    if (remaining > 0) startTimer(remaining)
  }

  createEffect(
    on(
      () => local.duration,
      (duration) => {
        remaining = duration ?? 5000
        startTimer(duration ?? 5000)
        onCleanup(clearTimer)
      },
    ),
  )

  const handleDismiss = (): void => {
    setIsVisible(false)
    local.onDismiss?.()
  }

  // Assertive announcement is appropriate for warnings/errors — an info or
  // success toast interrupting a screen-reader user mid-sentence for a
  // routine confirmation is the same over-announcing trap `role="alert"`
  // creates everywhere it's used for non-urgent content.
  const role = (): 'alert' | 'status' =>
    variant() === 'warning' || variant() === 'error' ? 'alert' : 'status'

  return (
    <Show when={isVisible()}>
      <div
        role={role()}
        data-state="open"
        class={cm.cn(cm.toast({ variant: variant() }), local.className)}
        style={toStyleProps(local.style)}
        data-testid={local.testId}
        onMouseEnter={pauseTimer}
        onMouseLeave={resumeTimer}
        onFocusIn={pauseTimer}
        onFocusOut={resumeTimer}
      >
        <Show when={statusIcon()}>
          <span class={cm.toastIconWrapper}>{statusIcon()}</span>
        </Show>
        <div class={cm.toastContentWrapper}>
          <Show when={local.title}>
            <div class={cm.toastTitle}>{local.title as JSX.Element}</div>
          </Show>
          <Show when={local.description || local.children}>
            <div class={cm.toastDescription}>
              {(local.description || local.children) as JSX.Element}
            </div>
          </Show>
        </div>
        <Show when={local.dismissible ?? true}>
          <button
            type="button"
            onClick={handleDismiss}
            class={cm.toastClose}
            aria-label={
              local.closeLabel ?? t('ui.toast.close', undefined, { defaultValue: 'Close' })
            }
          >
            {renderIcon('x-mark', cm.iconSm)}
          </button>
        </Show>
      </div>
    </Show>
  )
}

/**
 * Props for the {@link ToastContainer} component.
 */
interface ToastContainerProps {
  children?: JSX.Element
  position?: ToastProps['position']
  className?: string
}

/**
 * Container that positions toasts on screen via a portal.
 * @param props - The component props.
 * @returns The rendered toast container JSX.
 */
export const ToastContainer: Component<ToastContainerProps> = (props) => {
  const cm = getClassMap()

  const container = (
    <div
      class={cm.cn(
        cm.toastContainer({ position: props.position ?? 'bottom-right' }),
        props.className,
      )}
    >
      {props.children}
    </div>
  )

  if (typeof document === 'undefined') return null
  return <BodyPortal>{container}</BodyPortal>
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
 * @throws {Error} When used outside a `ToastProvider`.
 */
export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error(
      t('solid.error.useToastOutsideProvider', undefined, {
        defaultValue: 'useToast must be used within a ToastProvider',
      }),
    )
  }
  return context
}

/** Props for the {@link ToastProvider} component. */
interface ToastProviderProps {
  children?: JSX.Element
  position?: ToastProps['position']
}

let toastCounter = 0

/**
 * Provider component that manages global toast state.
 * @param props - The children and the default toast position.
 * @returns The rendered provider with toast container JSX.
 */
export const ToastProvider: Component<ToastProviderProps> = (props) => {
  const [toasts, setToasts] = createSignal<(ToastProps & { id: string })[]>([])

  const addToast = (toast: Omit<ToastProps, 'onDismiss'>): string => {
    const id = `toast-${++toastCounter}`
    setToasts((prev) => [...prev, { ...toast, id }])
    return id
  }

  const removeToast = (id: string): void => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {props.children}
      <ToastContainer position={props.position}>
        <For each={toasts()}>
          {(toast: ToastProps & { id: string }) => (
            <Toast {...toast} onDismiss={() => removeToast(toast.id)} />
          )}
        </For>
      </ToastContainer>
    </ToastContext.Provider>
  )
}
