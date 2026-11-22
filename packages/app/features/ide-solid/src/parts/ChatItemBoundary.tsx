/**
 * Per-item error boundary for the chat timeline.
 *
 * Solid counterpart of `@molecule/app-ide-react`'s `ChatItemBoundary` (see
 * that file for the design notes): the same props (React names), the same DOM
 * for the same input, and the same containment guarantee — a bad item
 * degrades to one inline notice and every sibling keeps working.
 *
 * Solid's `catchError` is the boundary: the first caught error flips the
 * component into its error state (React's `getDerivedStateFromError`) and the
 * report goes to the bonded logger and the host's `onError` (React's
 * `componentDidCatch`). The signal stops the error from re-reaching Solid's
 * owner chain on the re-render, as React's boundary stops it from climbing
 * past the item. The item body is invoked from inside the caught computation
 * — the placement React reaches with its child `RenderSlot` — so a
 * synchronous throw in the item's own branching is caught too, not only one
 * from its descendants.
 *
 * @module
 */

import type { Component, JSX } from 'solid-js'
import { catchError, createMemo, createSignal } from 'solid-js'

import { getLogger } from '@molecule/app-logger'
import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

/** React's `ErrorInfo`, as far as this boundary uses it: where the throw happened. */
export interface ChatItemErrorInfo {
  /** The component stack of the throw, when the framework provides one. */
  componentStack: string | null
}

/** Props for {@link ChatItemBoundary} — the React prop names, React's own contract. */
export interface ChatItemBoundaryProps {
  /** Produces the timeline item's element tree. Called during render, below the boundary. */
  render: () => JSX.Element
  /** Reports a caught render error (telemetry). Never throws. */
  onError?: (error: Error, info: ChatItemErrorInfo) => void
}

/**
 * The inline notice shown in place of a timeline item that failed to render.
 * Reads `t` from `useTranslation()`, so it re-renders in the new language when
 * the locale changes.
 *
 * @returns The inline failure notice.
 */
function ChatItemFallback(): JSX.Element {
  const { t } = useTranslation()
  const cm = getClassMap()
  return (
    <div
      data-mol-id="chat-item-render-error"
      class={cm.cn(cm.textSize('xs'), cm.textMuted)}
      style={{ padding: '6px 12px', 'font-style': 'italic' }}
    >
      {t('ide.chat.itemRenderError', undefined, {
        defaultValue: "This message couldn't be displayed.",
      })}
    </div>
  )
}

/**
 * Error boundary around a single chat timeline item.
 *
 * @param props - Component props (see {@link ChatItemBoundaryProps}).
 * @returns The item, or an inline notice when rendering it threw.
 *
 * @example
 * ```tsx
 * <ChatItemBoundary render={() => <MessageItem msg={msg} />} />
 * ```
 */
export const ChatItemBoundary: Component<ChatItemBoundaryProps> = (props) => {
  const [failed, setFailed] = createSignal(false)

  // A memo, exactly how Solid's own `ErrorBoundary` renders: the switch
  // between children and fallback is reactive state, not a re-mount.
  const view = createMemo(() => {
    if (failed()) return <ChatItemFallback />
    return catchError(
      () => props.render(),
      (error) => {
        const reported = error instanceof Error ? error : new Error(String(error))
        // Log unconditionally: a host that wires no reporter must still leave a trace,
        // or a contained failure becomes an invisible one.
        getLogger().error('Chat timeline item failed to render', {
          error: reported,
          componentStack: null,
        })
        try {
          props.onError?.(reported, { componentStack: null })
        } catch (_error) {
          // A failing error reporter must never escalate into a second render throw —
          // the whole point of this boundary is that nothing here can take the app down.
        }
        setFailed(true)
      },
    )
  })
  // The memo is read INSIDE the JSX, the way Solid's compiled insert reads a
  // returned accessor — a bare `return view()` would evaluate once at mount,
  // outside any reactive reader, and the failure flip would never re-render.
  return <>{view()}</>
}
