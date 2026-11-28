/**
 * Toast queue and overlay container for the React UI kit.
 *
 * @module
 */

import { Toast } from '#kit'
import {
  createContext,
  type FC,
  forwardRef,
  type NamedExoticComponent,
  type ReactNode,
  type RefAttributes,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'

import { useTranslation } from '@molecule/app-react'
import type { ElementHandle, ToastProps as WebToastProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Box } from '@molecule/app-ui-react/elements'
import { OverlayPortal, useOverlayLayer } from '@molecule/app-ui-react/platform'

import type { ToastProps } from '../types.js'
import { isReactNode } from '../utilities/isReactNode.js'
import { mergeRefs } from '../utilities/mergeRefs.js'

export { Toast } from '#kit'

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
