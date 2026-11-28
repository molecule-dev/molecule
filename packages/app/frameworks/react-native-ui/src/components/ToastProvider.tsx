/**
 * The native kit's inline container and numeric-handle provider on both renderers.
 *
 * @module
 */

import type { FC, ReactNode } from 'react'

import type { KitHosts } from '@molecule/app-react-ui-kit-components'
import { getClassMap, type ToastProps } from '@molecule/app-ui'

import { ToastContext, useToastQueue } from './toastState.js'

/** Props for the inline toast stack and provider. */
export interface ToastContainerProps {
  children?: ReactNode
  position?: ToastProps['position']
}

/**
 * Binds the native kit's inline provider to the renderer.
 * @param hosts - The notification and the host for the inline stack.
 * @returns The inline container and numeric-handle provider.
 */
export function bindNativeToasts(hosts: { Toast: FC<ToastProps>; Box: KitHosts['Box'] }): {
  ToastContainer: FC<ToastContainerProps>
  ToastProvider: FC<ToastContainerProps>
} {
  const { Toast, Box } = hosts
  const ToastContainer: FC<ToastContainerProps> = ({ children, position = 'bottom-right' }) => (
    <Box as="div" className={getClassMap().toastContainer({ position })}>
      {children}
    </Box>
  )

  const ToastProvider: FC<ToastContainerProps> = ({ children, position }) => {
    const { toasts, toast, dismiss } = useToastQueue()
    return (
      <ToastContext.Provider value={{ toast, dismiss }}>
        {children}
        <ToastContainer position={position}>
          {toasts.map((item) => (
            <Toast key={item.id} {...item.props} onDismiss={() => dismiss(item.id)} />
          ))}
        </ToastContainer>
      </ToastContext.Provider>
    )
  }

  return { ToastContainer, ToastProvider }
}
