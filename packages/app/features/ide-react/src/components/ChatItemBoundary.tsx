/**
 * Per-item error boundary for the chat timeline.
 *
 * Everything in the chat timeline is built from data an LLM authored — tool-call
 * inputs, tool outputs, card payloads, streamed markdown. None of it is validated
 * by the type system: a tool schema saying `type: 'string'` is a request to a model,
 * not a guarantee, and a value of the wrong shape reaching JSX throws during render.
 *
 * A throw during render unwinds to the nearest boundary. With only an app-level
 * boundary, one malformed option object blanks the entire IDE — the editor, the
 * preview, the file tree and every other message included — at the moment the user
 * submits their first prompt. That is the difference between a cosmetic defect and
 * an outage, and it is decided entirely by where the boundary sits.
 *
 * So each timeline item renders inside its own boundary: a bad item degrades to one
 * inline notice and every sibling keeps working. The item body is invoked from a
 * CHILD component (`RenderSlot`), not from this component's own render, because a
 * boundary cannot catch what it throws itself — that placement is what extends the
 * protection to synchronous throws in the item's own branching, not just to its
 * descendants.
 *
 * @module
 */

import type { ErrorInfo, JSX, ReactNode } from 'react'
import { Component } from 'react'

import { t } from '@molecule/app-i18n'
import { getLogger } from '@molecule/app-logger'
import { getClassMap } from '@molecule/app-ui'

/**
 * Invokes the item's render body as a child of the boundary, so a synchronous throw
 * in that body is caught by the boundary above rather than escaping to the app.
 *
 * @param props - Component props.
 * @param props.render - Produces the item's element tree.
 * @returns The rendered item.
 */
function RenderSlot({ render }: { render: () => ReactNode }): JSX.Element {
  return <>{render()}</>
}

interface Props {
  /** Produces the timeline item's element tree. Called during render, below the boundary. */
  render: () => ReactNode
  /** Reports a caught render error (telemetry). Never throws. */
  onError?: (error: Error, info: ErrorInfo) => void
}

interface State {
  failed: boolean
}

/**
 * Error boundary around a single chat timeline item.
 *
 * @example
 * ```tsx
 * <ChatItemBoundary key={id} render={() => <MessageItem msg={msg} />} />
 * ```
 */
export class ChatItemBoundary extends Component<Props, State> {
  override state: State = { failed: false }

  /**
   * Switches this item to its fallback after a render throw.
   * @returns The failed state.
   */
  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  /**
   * Reports the caught error so a malformed item is visible in telemetry rather
   * than only to the one user who hit it.
   * @param error - The thrown error.
   * @param info - React's component stack for the throw.
   */
  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Log unconditionally: a host that wires no reporter must still leave a trace,
    // or a contained failure becomes an invisible one.
    getLogger().error('Chat timeline item failed to render', {
      error,
      componentStack: info.componentStack,
    })
    try {
      this.props.onError?.(error, info)
    } catch (_error) {
      // A failing error reporter must never escalate into a second render throw —
      // the whole point of this boundary is that nothing here can take the app down.
    }
  }

  /**
   * Renders the timeline item, or its fallback once the item has failed.
   *
   * @returns The item, or an inline notice when rendering it threw.
   */
  override render(): ReactNode {
    if (this.state.failed) {
      const cm = getClassMap()
      return (
        <div
          data-mol-id="chat-item-render-error"
          className={cm.cn(cm.textSize('xs'), cm.textMuted)}
          style={{ padding: '6px 12px', fontStyle: 'italic' }}
        >
          {t('ide.chat.itemRenderError', undefined, {
            defaultValue: "This message couldn't be displayed.",
          })}
        </div>
      )
    }
    return <RenderSlot render={this.props.render} />
  }
}
