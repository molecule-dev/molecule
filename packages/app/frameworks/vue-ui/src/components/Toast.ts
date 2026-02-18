/**
 * Toast component.
 *
 * @module
 */

import {
  defineComponent,
  h,
  inject,
  type InjectionKey,
  onMounted,
  onUnmounted,
  type PropType,
  provide,
  reactive,
  ref,
  Teleport,
} from 'vue'

import { t } from '@molecule/app-i18n'
import type { ColorVariant } from '@molecule/app-ui'
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

type ToastPosition = 'top' | 'top-right' | 'top-left' | 'bottom' | 'bottom-right' | 'bottom-left'

interface ToastData {
  id: string
  title?: string
  description?: string
  status?: ColorVariant
  duration?: number
  dismissible?: boolean
}

interface ToastContext {
  toasts: ToastData[]
  addToast: (toast: Omit<ToastData, 'id'>) => string
  removeToast: (id: string) => void
}

const ToastContextKey: InjectionKey<ToastContext> = Symbol('ToastContext')

/**
 * Single Toast component.
 */
export const Toast = defineComponent({
  name: 'MToast',
  props: {
    title: String,
    description: String,
    status: {
      type: String as PropType<ColorVariant>,
      default: 'info',
    },
    duration: {
      type: Number,
      default: 5000,
    },
    dismissible: {
      type: Boolean,
      default: true,
    },
    closeLabel: String,
    class: String,
  },
  emits: ['dismiss'],
  setup(props, { emit, slots }) {
    const cm = getClassMap()
    const isVisible = ref(true)
    let timer: ReturnType<typeof setTimeout> | null = null

    const variant = statusVariantMap[props.status] || 'default'

    const handleDismiss = (): void => {
      isVisible.value = false
      emit('dismiss')
    }

    onMounted(() => {
      if (props.duration > 0) {
        timer = setTimeout(handleDismiss, props.duration)
      }
    })

    onUnmounted(() => {
      if (timer) clearTimeout(timer)
    })

    return () => {
      if (!isVisible.value) return null

      const iconName = statusIconMap[variant]

      return h(
        'div',
        {
          role: 'alert',
          'data-state': 'open',
          class: cm.cn(cm.toast({ variant }), props.class),
        },
        [
          iconName && h('span', { class: cm.toastIconWrapper }, renderIcon(iconName, cm.iconMd)),
          h('div', { class: cm.toastContentWrapper }, [
            props.title && h('div', { class: cm.toastTitle }, props.title),
            (props.description || slots.default) &&
              h('div', { class: cm.toastDescription }, props.description || slots.default?.()),
          ]),
          props.dismissible &&
            h(
              'button',
              {
                type: 'button',
                onClick: handleDismiss,
                class: cm.toastClose,
                'aria-label':
                  props.closeLabel ?? t('ui.toast.close', undefined, { defaultValue: 'Close' }),
              },
              renderIcon('x-mark', cm.iconSm),
            ),
        ],
      )
    }
  },
})

/**
 * Toast container component.
 */
export const ToastContainer = defineComponent({
  name: 'MToastContainer',
  props: {
    position: {
      type: String as PropType<ToastPosition>,
      default: 'bottom-right',
    },
    class: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()

    return () =>
      h(
        Teleport,
        { to: 'body' },
        h(
          'div',
          {
            class: cm.cn(cm.toastContainer({ position: props.position }), props.class),
          },
          slots.default?.(),
        ),
      )
  },
})

let toastCounter = 0

/**
 * Toast provider component.
 */
export const ToastProvider = defineComponent({
  name: 'MToastProvider',
  props: {
    position: {
      type: String as PropType<ToastPosition>,
      default: 'bottom-right',
    },
  },
  setup(props, { slots }) {
    const toasts = reactive<ToastData[]>([])

    const addToast = (toast: Omit<ToastData, 'id'>): string => {
      const id = `toast-${++toastCounter}`
      toasts.push({ ...toast, id })
      return id
    }

    const removeToast = (id: string): void => {
      const index = toasts.findIndex((t) => t.id === id)
      if (index !== -1) {
        toasts.splice(index, 1)
      }
    }

    provide(ToastContextKey, { toasts, addToast, removeToast })

    return () => [
      slots.default?.(),
      h(ToastContainer, { position: props.position }, () =>
        toasts.map((toast) =>
          h(Toast, {
            key: toast.id,
            title: toast.title,
            description: toast.description,
            status: toast.status,
            duration: toast.duration,
            dismissible: toast.dismissible,
            onDismiss: () => removeToast(toast.id),
          }),
        ),
      ),
    ]
  },
})

/**
 * Composable to use toast context.
 * @returns The result.
 */
export function useToast(): ToastContext {
  const context = inject(ToastContextKey)
  if (!context) {
    throw new Error(
      t('vue.error.useToastOutsideProvider', undefined, {
        defaultValue: 'useToast must be used within a ToastProvider',
      }),
    )
  }
  return context
}
