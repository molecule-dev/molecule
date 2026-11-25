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

import { I18nError } from '@molecule/app-i18n'
import type { IconName } from '@molecule/app-icons'
import { focusStaysWithin } from '@molecule/app-overlay-dom'
import { BodyPortal, ResolveNode, useTranslation } from '@molecule/app-solid'
import type { ColorVariant } from '@molecule/app-ui'
import { getClassMap, ToastCountdown } from '@molecule/app-ui'

import type { ToastProps } from '../types.js'
import { reactDomProps, toStyleProps, type WithRef } from '../utilities/dom.js'
import { renderIcon } from '../utilities/renderIcon.jsx'
import { withDisplayName } from './displayName.js'

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
export const Toast = withDisplayName<WithRef<ToastProps, HTMLDivElement>>((props) => {
  const [local, rest] = splitProps(props, [
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
    // The countdown's own pause/resume handlers (below) run first; a caller's
    // handlers for the same events run after them.
    'onMouseEnter',
    'onMouseLeave',
    'onFocus',
    'onBlur',
  ])

  const [isVisible, setIsVisible] = createSignal(true)
  const cm = getClassMap()
  const { t } = useTranslation()
  const status = (): NonNullable<ToastProps['status']> => local.status ?? 'info'
  const variant = (): 'default' | 'success' | 'warning' | 'error' | 'info' =>
    statusVariantMap[status()] || 'default'
  const iconName = (): IconName | undefined => statusIconMap[variant()]
  const statusIcon = (): JSX.Element | null => {
    const name = iconName()
    return name ? renderIcon(name, cm.iconMd) : null
  }
  const countdown = new ToastCountdown(() => {
    setIsVisible(false)
    local.onDismiss?.()
  })
  createEffect(
    on(
      () => local.duration,
      (duration) => {
        countdown.start(duration ?? 5000)
        onCleanup(countdown.stop)
      },
    ),
  )

  // Assertive announcement is appropriate for warnings/errors — an info or
  // success toast interrupting a screen-reader user mid-sentence for a
  // routine confirmation is the same over-announcing trap `role="alert"`
  // creates everywhere it's used for non-urgent content.
  const role = (): 'alert' | 'status' =>
    variant() === 'warning' || variant() === 'error' ? 'alert' : 'status'

  return (
    <Show when={isVisible()}>
      <div
        // A caller's role, spread below, replaces this default.
        role={role()}
        data-state="open"
        class={cm.cn(cm.toast({ variant: variant() }), local.className)}
        style={toStyleProps(local.style)}
        data-testid={local.testId}
        {...reactDomProps(rest)}
        onMouseEnter={(event) => {
          countdown.setPaused('hover', true)
          local.onMouseEnter?.(event)
        }}
        onMouseLeave={(event) => {
          countdown.setPaused('hover', false)
          local.onMouseLeave?.(event)
        }}
        onFocusIn={(event) => {
          countdown.setPaused('focus', true)
          local.onFocus?.(event)
        }}
        onFocusOut={(event) => {
          if (!focusStaysWithin(event)) countdown.setPaused('focus', false)
          local.onBlur?.(event)
        }}
      >
        <Show when={statusIcon()}>
          <span class={cm.toastIconWrapper}>{statusIcon()}</span>
        </Show>
        <div class={cm.toastContentWrapper}>
          <Show when={local.title}>
            <div class={cm.toastTitle}>{local.title}</div>
          </Show>
          {/* React's `slot(children)`: children that render nothing add no description line (a
              `description` is a plain string prop, and while it is set the children are not shown). */}
          <ResolveNode node={local.description ? undefined : local.children}>
            {(content, hasContent) => (
              <Show when={local.description || hasContent()}>
                <div class={cm.toastDescription}>{local.description || content()}</div>
              </Show>
            )}
          </ResolveNode>
        </div>
        <Show when={local.dismissible ?? true}>
          <button
            type="button"
            onClick={countdown.dismiss}
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
}, 'Toast')

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
export const ToastContainer = withDisplayName<WithRef<ToastContainerProps, HTMLDivElement>>(
  (props) => {
    const cm = getClassMap()

    const container = (
      <div
        ref={(el) => {
          if (typeof props.ref === 'function') props.ref(el)
        }}
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
  },
  'ToastContainer',
)

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
    // Thrown outside rendering (a hook used outside its provider), so the
    // message is the I18nError's own English fallback, not a render-time `t`.
    throw new I18nError(
      'solid.error.useToastOutsideProvider',
      undefined,
      'useToast must be used within a ToastProvider',
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
    // A caller's `id` is the toast's handle and its element id; otherwise one is generated.
    const id = toast.id ?? `toast-${++toastCounter}`
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
