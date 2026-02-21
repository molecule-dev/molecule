/**
 * Toast notification components for React Native.
 *
 * @module
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Animated, Pressable, Text, View } from 'react-native'

import { t } from '@molecule/app-i18n'
import type { ToastProps } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Renders a Toast component.
 * @param root0 - Component props.
 * @param root0.title - Toast title text.
 * @param root0.description - Toast description text.
 * @param root0.status - Status type.
 * @param root0.duration - Auto-dismiss duration (ms).
 * @param root0.dismissible - Whether dismissible.
 * @param root0.onDismiss - Dismiss handler.
 * @param root0.className - CSS class name override.
 * @param root0.testId - Test identifier.
 * @returns The rendered Toast element.
 */
export const Toast: React.FC<ToastProps> = ({
  title,
  description,
  status,
  duration = 5000,
  dismissible = true,
  onDismiss,
  className,
  testId,
}) => {
  const cm = getClassMap()
  const classes = cm.cn(
    cm.toast({
      variant: (status || 'default') as 'default' | 'success' | 'warning' | 'error' | 'info',
    }),
    className,
  )
  const opacity = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => onDismiss?.())
      }, duration)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [duration, onDismiss, opacity])

  return (
    <Animated.View className={classes} style={{ opacity }} testID={testId}>
      <View className={cm.toastContentWrapper}>
        {!!title && <Text className={cm.toastTitle}>{title as React.ReactNode}</Text>}
        {!!description && (
          <Text className={cm.toastDescription}>{description as React.ReactNode}</Text>
        )}
      </View>
      {dismissible && (
        <Pressable
          className={cm.toastClose}
          onPress={onDismiss}
          accessibilityLabel={t('ui.toast.dismiss', undefined, { defaultValue: 'Dismiss' })}
          accessibilityRole="button"
        >
          <Text>{t('ui.icon.close', undefined, { defaultValue: '✕' })}</Text>
        </Pressable>
      )}
    </Animated.View>
  )
}

/**
 * Renders a ToastContainer component.
 * @param root0 - Component props.
 * @param root0.children - Toast elements.
 * @param root0.position - Screen position.
 * @returns The rendered ToastContainer element.
 */
export const ToastContainer: React.FC<{
  children: React.ReactNode
  position?: 'top' | 'top-right' | 'top-left' | 'bottom' | 'bottom-right' | 'bottom-left'
}> = ({ children, position = 'bottom-right' }) => {
  const cm = getClassMap()
  return <View className={cm.toastContainer({ position })}>{children}</View>
}

// ---- Toast context ----

interface ToastItem {
  id: number
  props: ToastProps
}

interface ToastContextValue {
  toast: (props: Omit<ToastProps, 'onDismiss'>) => number
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let toastCounter = 0

/**
 * Renders a ToastProvider component.
 * @param root0 - Component props.
 * @param root0.children - App content.
 * @param root0.position - Toast position.
 * @returns The rendered ToastProvider element.
 */
export const ToastProvider: React.FC<{
  children: React.ReactNode
  position?: 'top' | 'top-right' | 'top-left' | 'bottom' | 'bottom-right' | 'bottom-left'
}> = ({ children, position = 'bottom-right' }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback((props: Omit<ToastProps, 'onDismiss'>) => {
    const id = ++toastCounter
    setToasts((prev) => [...prev, { id, props: props as ToastProps }])
    return id
  }, [])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

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

/**
 * Hook for toast notifications.
 * @returns The toast context value.
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error(
      t('ui.toast.error.noProvider', undefined, {
        defaultValue: 'useToast must be used within a ToastProvider',
      }),
    )
  }
  return context
}
