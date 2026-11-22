/**
 * Per-item error boundary for the chat timeline.
 *
 * Vue counterpart of `@molecule/app-ide-react`'s `ChatItemBoundary` (see that
 * file for the design notes): the same props (React names), the same DOM for
 * the same input, and the same containment guarantee — a bad item degrades to
 * one inline notice and every sibling keeps working.
 *
 * Vue's `onErrorCaptured` is the boundary: the first caught error flips the
 * component into its error state (React's `getDerivedStateFromError`) and the
 * report goes to the bonded logger and the host's `onError` (React's
 * `componentDidCatch`). Returning `false` stops the error from propagating to
 * app-level handlers, as React's boundary stops it from climbing past the
 * item. As in React, the item body is invoked from a CHILD component
 * (`RenderSlot`): a component cannot capture what it throws in its own
 * render, and that placement is what extends the protection to synchronous
 * throws in the item's own branching.
 *
 * @module
 */

import { defineComponent, h, onErrorCaptured, type PropType, ref, type VNodeChild } from 'vue'

import { getLogger } from '@molecule/app-logger'
import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

/** React's `ErrorInfo`, as far as this boundary uses it: where the throw happened. */
export interface ChatItemErrorInfo {
  /** The component stack of the throw, when the framework provides one. */
  componentStack: string | null
}

/** Props for {@link ChatItemBoundary} — the React prop names, React's own contract. */
export interface ChatItemBoundaryProps {
  /** Produces the timeline item's element tree. Called during render, below the boundary. */
  render: () => VNodeChild
  /** Reports a caught render error (telemetry). Never throws. */
  onError?: (error: Error, info: ChatItemErrorInfo) => void
}

/**
 * Invokes the item's render body as a child of the boundary, so a synchronous
 * throw in that body is caught by the boundary above rather than escaping to
 * the app.
 *
 * @param props - Component props.
 * @returns The rendered item.
 */
const RenderSlot = defineComponent({
  name: 'RenderSlot',
  props: { render: { type: Function as PropType<() => VNodeChild>, required: true } },
  setup(props) {
    /**
     * Renders the item.
     *
     * @returns The rendered item.
     */
    return () => props.render()
  },
})

/**
 * The inline notice shown in place of a timeline item that failed to render.
 * Reads `t` from `useTranslation()`, so it re-renders in the new language when
 * the locale changes.
 *
 * @returns The inline failure notice.
 */
const ChatItemFallback = defineComponent({
  name: 'ChatItemFallback',
  setup() {
    const { t } = useTranslation()
    const cm = getClassMap()
    return () =>
      h(
        'div',
        {
          'data-mol-id': 'chat-item-render-error',
          class: cm.cn(cm.textSize('xs'), cm.textMuted),
          style: { padding: '6px 12px', fontStyle: 'italic' },
        },
        t('ide.chat.itemRenderError', undefined, {
          defaultValue: "This message couldn't be displayed.",
        }),
      )
  },
})

/**
 * Error boundary around a single chat timeline item.
 *
 * @example
 * ```ts
 * import { h } from 'vue'
 * import { ChatItemBoundary } from '@molecule/app-ide-vue'
 *
 * h(ChatItemBoundary, { key: id, render: () => h(MessageItem, { msg }) })
 * ```
 */
export const ChatItemBoundary = defineComponent({
  name: 'ChatItemBoundary',
  props: {
    /** Produces the timeline item's element tree. Called during render, below the boundary. */
    render: { type: Function as PropType<ChatItemBoundaryProps['render']>, required: true },
    /** Reports a caught render error (telemetry). Never throws. */
    onError: {
      type: Function as PropType<ChatItemBoundaryProps['onError']>,
      required: false,
      default: undefined,
    },
  },
  setup(props) {
    const failed = ref(false)

    onErrorCaptured((error, _instance, info) => {
      const reported = error instanceof Error ? error : new Error(String(error))
      // Log unconditionally: a host that wires no reporter must still leave a trace,
      // or a contained failure becomes an invisible one.
      getLogger().error('Chat timeline item failed to render', {
        error: reported,
        componentStack: info,
      })
      failed.value = true
      try {
        props.onError?.(reported, { componentStack: info })
      } catch (_error) {
        // A failing error reporter must never escalate into a second render throw —
        // the whole point of this boundary is that nothing here can take the app down.
      }
      return false
    })

    /**
     * Renders the timeline item, or its fallback once the item has failed.
     *
     * @returns The item, or an inline notice when rendering it threw.
     */
    return () => (failed.value ? h(ChatItemFallback) : h(RenderSlot, { render: props.render }))
  },
})
