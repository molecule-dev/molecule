/**
 * React Native's public Toast signatures.
 *
 * @module
 */

import type { ForwardRefExoticComponent, RefAttributes } from 'react'

import type { ElementHandle } from '@molecule/app-ui'

import type { ToastProps } from '../types.js'
import {
  Toast as SharedToast,
  ToastContainer as SharedToastContainer,
  type ToastContainerProps,
  type ToastContextValue,
  useToast as useSharedToast,
} from './Toast.js'

/** Renders a notification and forwards its renderer's host handle. */
export const Toast: ForwardRefExoticComponent<ToastProps & RefAttributes<ElementHandle>> =
  SharedToast

/** Positions notifications in a portal and forwards its host handle. */
export const ToastContainer: ForwardRefExoticComponent<
  ToastContainerProps & RefAttributes<ElementHandle>
> = SharedToastContainer

/** Adds and removes notifications using React-renderable content. */
export const useToast: () => ToastContextValue<ToastProps> = useSharedToast

export { ToastProvider } from './Toast.js'
