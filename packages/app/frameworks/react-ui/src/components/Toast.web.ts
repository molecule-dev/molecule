/**
 * React DOM's public Toast signatures.
 *
 * @module
 */

import type { ForwardRefExoticComponent, RefAttributes } from 'react'

import type { ToastProps } from '@molecule/app-ui'

import {
  Toast as SharedToast,
  ToastContainer as SharedToastContainer,
  type ToastContainerProps,
  type ToastContextValue,
  useToast as useSharedToast,
} from './Toast.js'

/** Renders a notification and forwards its div to the caller. */
export const Toast: ForwardRefExoticComponent<ToastProps & RefAttributes<HTMLDivElement>> =
  SharedToast

/** Positions notifications in a portal and forwards the container div. */
export const ToastContainer: ForwardRefExoticComponent<
  ToastContainerProps & RefAttributes<HTMLDivElement>
> = SharedToastContainer

/** Adds and removes notifications using the published web payload. */
export const useToast: () => ToastContextValue<ToastProps> = useSharedToast

export { ToastProvider } from './Toast.js'
