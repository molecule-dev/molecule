/**
 * Toast context shared by `ToastProvider`, `ToastContainer` and `useToast`,
 * mirroring the React package's toast context.
 *
 * @module
 */

import { getContext } from 'svelte'

import { t } from '@molecule/app-i18n'

import type { ToastProps } from './types.js'

/** A managed toast entry: the caller's toast props plus its id. */
export type ManagedToast = ToastProps & { id: string }

/** What {@link useToast} returns: the current toasts and how to change them. */
export interface ToastContextValue {
  /** The currently shown toasts. */
  toasts: ManagedToast[]
  /** Adds a toast and returns its id. */
  addToast: (toast: Omit<ToastProps, 'onDismiss'>) => string
  /** Removes a toast by id. */
  removeToast: (id: string) => void
}

/** The Svelte context key for the toast context. */
export const TOAST_CONTEXT = Symbol('molecule-toast')

/**
 * Hook to access the toast context for adding and removing toasts. Reads
 * Svelte context, so it is only legal during component initialization.
 *
 * @returns The toast context value with toast management methods.
 */
export function useToast(): ToastContextValue {
  const context = getContext<ToastContextValue>(TOAST_CONTEXT)
  if (!context) {
    throw new Error(
      t('svelte.error.useToastOutsideProvider', undefined, {
        defaultValue: 'useToast must be used within a ToastProvider',
      }),
    )
  }
  return context
}
