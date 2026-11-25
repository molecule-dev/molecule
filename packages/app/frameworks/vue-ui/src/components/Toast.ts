/**
 * Vue Toast UI components with UIClassMap-driven styling.
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
  type VNodeChild,
  watch,
} from 'vue'

import { I18nError } from '@molecule/app-i18n'
import type { IconName } from '@molecule/app-icons'
import { focusStaysWithin } from '@molecule/app-overlay-dom'
import type { ColorVariant, ToastProps } from '@molecule/app-ui'
import { getClassMap, ToastCountdown } from '@molecule/app-ui'
import { toChildArray, useTranslation } from '@molecule/app-vue'

import { attrListener, classOf, restAttrs, styleOf } from '../utilities/attrs.js'
import { useElementRef } from '../utilities/elementRef.js'
import { renderIcon } from '../utilities/renderIcon.js'
import { setDisplayName } from './displayName.js'

/** Where a {@link ToastContainer} anchors its toasts on screen. */
type ToastPosition = 'top' | 'top-right' | 'top-left' | 'bottom' | 'bottom-right' | 'bottom-left'

/** One toast the provider manages: its props plus the provider-assigned id. */
type ToastEntry = Omit<ToastProps, 'onDismiss'> & { id: string }

/** What {@link ToastProvider} provides and {@link useToast} returns. */
export interface ToastContext {
  /** The currently managed toasts, oldest first. */
  toasts: ToastEntry[]
  /** Adds a toast and returns its id (the caller's `id` when given). */
  addToast: (toast: Omit<ToastEntry, 'id'> & { id?: string }) => string
  /** Removes the toast with the given id. */
  removeToast: (id: string) => void
}

/** Injection key carrying the {@link ToastContext} from provider to consumer. */
const toastContextKey: InjectionKey<ToastContext> = Symbol('ToastContext')

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
 * Map toast variant to icon name.
 */
const statusIconMap: Record<string, IconName> = {
  info: 'info-circle',
  success: 'check-circle',
  warning: 'exclamation-triangle',
  error: 'x-circle',
}

/**
 * Vue Toast UI component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s Toast. The auto-dismiss
 * countdown pauses on hover AND focus (WCAG 2.2.1) and resumes with whatever
 * time was left. The announced role follows `status`: `warning`/`error` get
 * the assertive `role="alert"`; every other status gets the polite
 * `role="status"`.
 */
export const Toast = defineComponent({
  name: 'MToast',
  inheritAttrs: false,
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
    position: {
      type: String as PropType<ToastPosition>,
      default: 'bottom-right',
    },
    closeLabel: String,
    className: String,
    style: [String, Object] as PropType<ToastProps['style']>,
    testId: String,
  },
  emits: ['dismiss'],
  setup(props, { attrs, emit, slots, expose }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const element = useElementRef<HTMLDivElement>(expose)
    const isVisible = ref(true)

    const countdown = new ToastCountdown(() => {
      isVisible.value = false
      emit('dismiss')
    })
    onMounted(() => countdown.start(props.duration))
    watch(
      () => props.duration,
      (duration) => countdown.start(duration),
    )
    onUnmounted(countdown.stop)

    return () => {
      if (!isVisible.value) return null

      const variant = statusVariantMap[props.status] || 'default'
      const iconName = statusIconMap[variant]
      const statusIcon = iconName ? renderIcon(iconName, cm.iconMd) : null

      // Assertive announcement is appropriate for warnings/errors; every
      // other status stays polite so routine confirmations don't interrupt a
      // screen reader mid-sentence.
      const role = variant === 'warning' || variant === 'error' ? 'alert' : 'status'

      const titleNode = props.title ?? slots.title?.()
      const title = toChildArray(titleNode).length > 0 ? titleNode : undefined
      const descriptionNode = props.description ?? slots.description?.()
      const description = toChildArray(descriptionNode).length > 0 ? descriptionNode : undefined
      const childrenNode = slots.default?.()
      const childrenContent = toChildArray(childrenNode).length > 0 ? childrenNode : undefined
      const body = description ?? childrenContent

      const content: VNodeChild[] = []
      if (title) content.push(h('div', { class: cm.toastTitle }, title))
      if (body) content.push(h('div', { class: cm.toastDescription }, body))

      const children: VNodeChild[] = []
      if (statusIcon) children.push(h('span', { class: cm.toastIconWrapper }, statusIcon))
      children.push(h('div', { class: cm.toastContentWrapper }, content))
      if (props.dismissible) {
        children.push(
          h(
            'button',
            {
              type: 'button',
              onClick: countdown.dismiss,
              class: cm.toastClose,
              'aria-label':
                props.closeLabel ?? t('ui.toast.close', undefined, { defaultValue: 'Close' }),
            },
            renderIcon('x-mark', cm.iconSm),
          ),
        )
      }

      // React destructures these four and runs its own timer handlers first, then
      // the caller's; they are not part of its root spread.
      const rest = { ...attrs }
      const callerMouseEnter = attrListener<[MouseEvent]>(rest, 'onMouseEnter')
      const callerMouseLeave = attrListener<[MouseEvent]>(rest, 'onMouseLeave')
      const callerFocus = attrListener<[FocusEvent]>(rest, 'onFocus')
      const callerBlur = attrListener<[FocusEvent]>(rest, 'onBlur')
      delete rest.onMouseEnter
      delete rest.onMouseLeave
      delete rest.onFocus
      delete rest.onBlur

      // React's onFocus/onBlur are the bubbling focusin/focusout events.
      return h(
        'div',
        {
          ref: element,
          role,
          'data-state': 'open',
          class: cm.cn(cm.toast({ variant }), ...classOf(props.className, attrs)),
          style: styleOf(props.style, attrs),
          'data-testid': props.testId,
          // Every other declared prop (id, aria-*, data-*, automationId as
          // data-mol-id, the DOM event handlers) reaches the root; a caller's role
          // replaces the live-region default.
          ...restAttrs(rest),
          onMouseenter: (event: MouseEvent) => {
            countdown.setPaused('hover', true)
            callerMouseEnter?.(event)
          },
          onMouseleave: (event: MouseEvent) => {
            countdown.setPaused('hover', false)
            callerMouseLeave?.(event)
          },
          onFocusin: (event: FocusEvent) => {
            countdown.setPaused('focus', true)
            callerFocus?.(event)
          },
          onFocusout: (event: FocusEvent) => {
            if (!focusStaysWithin(event)) countdown.setPaused('focus', false)
            callerBlur?.(event)
          },
        },
        children,
      )
    }
  },
})

setDisplayName(Toast, 'Toast')

/**
 * Vue Toast container component with UIClassMap-driven styling.
 *
 * Faithful port of `@molecule/app-ui-react`'s ToastContainer: a positioned
 * stack rendered into a `document.body` portal.
 *
 * @returns The component definition.
 */
export const ToastContainer = defineComponent({
  name: 'MToastContainer',
  inheritAttrs: false,
  props: {
    position: {
      type: String as PropType<ToastPosition>,
      default: 'bottom-right',
    },
    className: String,
  },
  setup(props, { attrs, slots, expose }) {
    const cm = getClassMap()
    const element = useElementRef<HTMLDivElement>(expose)

    return () => {
      if (typeof document === 'undefined') return null
      // Teleport children go through the ARRAY form: the slots-object form
      // whose default returns a single VNode silently renders nothing (Vue
      // 3.5 keeps the teleport anchors but never mounts the content).
      return h(Teleport, { to: 'body' }, [
        h(
          'div',
          {
            ref: element,
            class: cm.cn(
              cm.toastContainer({ position: props.position }),
              ...classOf(props.className, attrs),
            ),
          },
          slots.default?.(),
        ),
      ])
    }
  },
})

setDisplayName(ToastContainer, 'ToastContainer')

let toastCounter = 0

/**
 * Vue Toast provider component.
 *
 * Faithful port of `@molecule/app-ui-react`'s ToastProvider: renders its
 * children plus a positioned {@link ToastContainer} and manages toasts added
 * through {@link useToast}.
 *
 * @returns The component definition.
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
    const toasts = reactive<ToastEntry[]>([])

    const addToast = (toast: Omit<ToastEntry, 'id'> & { id?: string }): string => {
      // A caller's `id` is the toast's handle and its element id; otherwise one is generated.
      const id = toast.id ?? `toast-${++toastCounter}`
      toasts.push({ ...toast, id })
      return id
    }

    const removeToast = (id: string): void => {
      const index = toasts.findIndex((toast) => toast.id === id)
      if (index !== -1) toasts.splice(index, 1)
    }

    provide(toastContextKey, { toasts, addToast, removeToast })

    return () => [
      slots.default?.(),
      h(
        ToastContainer,
        { position: props.position },
        {
          default: () =>
            toasts.map((toast) =>
              h(Toast, { ...toast, key: toast.id, onDismiss: () => removeToast(toast.id) }),
            ),
        },
      ),
    ]
  },
})

/**
 * Composable to access the toast context for adding and removing toasts.
 *
 * @returns The toast context with toast management methods.
 * @throws {I18nError} When called outside a {@link ToastProvider}.
 */
export function useToast(): ToastContext {
  const context = inject(toastContextKey)
  if (!context) {
    // Thrown outside rendering: I18nError keeps the key so a renderer can
    // re-translate it at display time; message stays the English fallback.
    throw new I18nError(
      'vue.error.useToastOutsideProvider',
      undefined,
      'useToast must be used within a ToastProvider',
    )
  }
  return context
}
