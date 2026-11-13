/**
 * Vue LoadErrorBanner UI component — the shared "load failed" banner with
 * Retry, with UIClassMap-driven styling.
 *
 * Use it wherever a page/section fetch FAILS — it pairs with `Skeleton` for
 * the loading state and `EmptyState` for the empty one. For form-submit
 * errors use `<Alert status="error">` instead; this banner is specifically
 * the load-failure-with-retry pattern, and its Retry button owns the
 * pending/disabled state so the caller cannot double-fire it.
 *
 * @remarks
 * Pass `onRetry` as a promise-returning function (`@retry` in templates);
 * while it is pending the retry button is disabled and shows a localized
 * "Retrying…" label, and a rejection is NOT swallowed silently — the banner
 * stays (callers render persistent failure by keeping the error state, which
 * keeps this banner mounted). Omit `onRetry` and no retry button renders
 * (display-only failure). `className` and the rest props (`data-*`,
 * `aria-*`) land on the ROOT div like React's `{...rest}` spread (fleet
 * locator convention); the retry button carries `retryMolId`
 * (default `load-error-retry`) so e2e can click it without knowing the
 * page. Announced politely (`role="status"` via the inner Alert's
 * `live={false}`) — a load failure on initial render has nothing to
 * interrupt.
 *
 * @module
 */

import { defineComponent, h, type PropType, ref, type VNodeChild } from 'vue'

import { t } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'

import { classOf, restAttrs, styleOf } from '../utilities/attrs.js'
import { Alert } from './Alert.js'
import { Button } from './Button.js'

/**
 * Vue LoadErrorBanner UI component with an owned pending-state Retry button.
 *
 * Faithful port of `@molecule/app-ui-react`'s LoadErrorBanner.
 */
export const LoadErrorBanner = defineComponent({
  name: 'MLoadErrorBanner',
  inheritAttrs: false,
  props: {
    message: null,
    detail: null,
    // Declared as a prop (not an emit) because the pending state is driven
    // by the promise the listener RETURNS; Vue's `emit` discards return
    // values. `@retry` templates still bind here (Vue normalizes the
    // listener to the `onRetry` prop).
    onRetry: {
      type: Function as PropType<() => void | Promise<void>>,
      default: undefined,
    },
    retryLabel: null,
    retryMolId: {
      type: String,
      default: 'load-error-retry',
    },
    className: String,
    style: [String, Object] as PropType<Record<string, string | number> | string>,
  },
  setup(props, { attrs, slots }) {
    const cm = getClassMap()
    const pending = ref(false)

    const handleRetry = (): void => {
      if (!props.onRetry || pending.value) return
      pending.value = true
      // A rejected retry means "still failing": the caller owns that error
      // and keeps showing the banner, so ignoring it here only stops it
      // becoming an unhandled rejection.
      void Promise.resolve(props.onRetry())
        .catch((_error: unknown) => undefined)
        .finally(() => {
          pending.value = false
        })
    }

    return () => {
      const message = props.message ?? slots.message?.()
      const detail = props.detail ?? slots.detail?.()
      const retryLabel = props.retryLabel ?? slots.retryLabel?.()

      const stack: VNodeChild[] = [h('p', { class: cm.textSize('sm') }, [message])]
      if (detail) stack.push(h('p', { class: cm.cn(cm.textSize('xs'), cm.textMuted) }, [detail]))
      const children = slots.default?.()
      if (children !== undefined) stack.push(children)
      if (props.onRetry) {
        stack.push(
          h('div', { class: cm.flex({ justify: 'start' }) }, [
            h(
              Button,
              {
                variant: 'outline',
                size: 'sm',
                disabled: pending.value,
                'data-mol-id': props.retryMolId,
                onClick: () => handleRetry(),
              },
              () =>
                pending.value
                  ? t('loadError.retrying', {}, { defaultValue: 'Retrying…' })
                  : (retryLabel ?? t('loadError.retry', {}, { defaultValue: 'Retry' })),
            ),
          ]),
        )
      }

      return h(
        'div',
        {
          class: classOf(props.className, attrs),
          style: styleOf(props.style, attrs),
          ...restAttrs(attrs),
        },
        [
          h(
            Alert,
            { status: 'error', live: false },
            {
              default: () => [h('div', { class: cm.stack(2) }, stack)],
            },
          ),
        ],
      )
    }
  },
})
