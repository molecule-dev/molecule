/**
 * RootErrorBoundary component (React parity).
 *
 * @module
 */

import { defineComponent, h, onErrorCaptured, ref, type VNodeChild } from 'vue'

import { error as logError } from '@molecule/app-logger'

import { RootErrorFallback } from './RootErrorFallback.js'

/** Props accepted by the {@link RootErrorBoundary} component. */
interface Props {
  /** The app tree to guard (typically the routed root); also accepted as the default slot. */
  children?: VNodeChild
}

/**
 * RootErrorBoundary component.
 *
 * Top-level error boundary that catches descendant render errors, logs them
 * via the bonded `@molecule/app-logger`, and falls back to a minimal
 * localized recovery surface read through `useTranslation()` from
 * `@molecule/app-vue`. Renders its children untouched while no error has been
 * caught — there is no wrapper element, matching React's fragment root.
 *
 * This is the Vue counterpart of `@molecule/app-root-error-boundary-react`.
 *
 * @remarks
 * Vue's `onErrorCaptured` is the boundary: the first caught error flips the
 * component into its error state (React's `getDerivedStateFromError`) and the
 * report goes to the bonded logger (React's `componentDidCatch`). Returning
 * `false` stops the error from propagating to app-level handlers, as React's
 * boundary stops it from climbing past the tree root.
 */
export const RootErrorBoundary = defineComponent({
  name: 'RootErrorBoundary',
  props: {
    children: null,
  },
  setup(props, { slots }) {
    const hasError = ref(false)

    onErrorCaptured((error, _instance, info) => {
      logError(error instanceof Error ? error : new Error(String(error)), info)
      hasError.value = true
      return false
    })

    /**
     * Renders children normally, or the localized fallback once an error has
     * been caught.
     *
     * @returns The guarded tree, or the recovery alert.
     */
    return () => {
      if (hasError.value) return h(RootErrorFallback)
      if (slots.default) return slots.default()
      const children = props.children as Props['children']
      return children != null ? [children] : []
    }
  },
})
