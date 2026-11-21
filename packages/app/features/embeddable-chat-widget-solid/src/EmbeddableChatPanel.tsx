/**
 * Expanded chat panel — header + scrollable message list + composer.
 * Solid counterpart of `@molecule/app-embeddable-chat-widget`'s
 * `EmbeddableChatPanel` — the same props (React names), the same DOM.
 *
 * @module
 */

import { type Component, createEffect, createSignal, Show } from 'solid-js'

import { sendChatRequest } from './sendChatRequest.js'
import type {
  EmbeddableChatMessage,
  EmbeddableChatWidgetConfig,
  EmbeddableChatWidgetPosition,
  EmbeddableChatWidgetTheme,
} from './types.js'
import { useSafeTranslation } from './useSafeTranslation.js'

/**
 * The message bubble's wrapper style (alignment by role). Styles in this
 * package are built by functions so Solid applies them at runtime
 * (per-property `setProperty`), where the DOM normalizes each value exactly
 * as React's inline-style object does — a static object would be baked into
 * the template attribute verbatim and read unnormalized.
 *
 * @param isSelf - Whether the message is the user's.
 * @returns The style declarations.
 */
const messageWrapperStyle = (isSelf: boolean): Record<string, string> => ({
  display: 'flex',
  'justify-content': isSelf ? 'flex-end' : 'flex-start',
  'margin-bottom': '8px',
})

/**
 * The message bubble's style.
 *
 * @param isSelf - Whether the message is the user's.
 * @param theme - The optional widget theme.
 * @returns The style declarations.
 */
const bubbleStyle = (
  isSelf: boolean,
  theme: EmbeddableChatWidgetTheme | undefined,
): Record<string, string> => ({
  'max-width': '80%',
  padding: '8px 12px',
  'border-radius': '14px',
  'font-size': '14px',
  'line-height': '1.4',
  'white-space': 'pre-wrap',
  'word-break': 'break-word',
  background: isSelf ? (theme?.primaryColor ?? '#2563eb') : '#ffffff',
  color: isSelf ? (theme?.primaryForegroundColor ?? '#ffffff') : '#111827',
  border: isSelf ? 'none' : '1px solid #e5e7eb',
})

/**
 * One typing-indicator dot's style.
 *
 * @param delay - The animation delay in ms.
 * @returns The style declarations.
 */
const dotStyle = (delay: number): Record<string, string> => ({
  display: 'inline-block',
  width: '6px',
  height: '6px',
  'border-radius': '50%',
  background: '#9ca3af',
  margin: '0 2px',
  animation: 'molecule-embed-pulse 1.2s ease-in-out infinite',
  'animation-delay': `${delay}ms`,
})

/** The inline `@keyframes` rule the typing dots animate with. */
const TYPING_CSS =
  '@keyframes molecule-embed-pulse { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }'

/** The typing indicator's wrapper style. */
const typingWrapperStyle = (): Record<string, string> => ({ padding: '4px 4px 8px' })

/**
 * The panel header's style.
 *
 * @param config - The widget config (its theme colours the header).
 * @returns The style declarations.
 */
const headerStyle = (config: EmbeddableChatWidgetConfig): Record<string, string> => ({
  background: config.theme?.primaryColor ?? '#2563eb',
  color: config.theme?.primaryForegroundColor ?? '#ffffff',
  padding: '12px 16px',
  display: 'flex',
  'align-items': 'center',
  gap: '12px',
})

/** The brand logo's style. */
const logoStyle = (): Record<string, string> => ({
  width: '24px',
  height: '24px',
  'border-radius': '4px',
  'object-fit': 'cover',
})

/** The header title's style. */
const headerTitleStyle = (): Record<string, string> => ({ 'font-size': '14px' })

/** The close button's style. */
const closeBtnStyle = (): Record<string, string> => ({
  'margin-left': 'auto',
  background: 'transparent',
  border: 'none',
  color: 'inherit',
  cursor: 'pointer',
  'font-size': '20px',
  'line-height': '1',
  padding: '4px 8px',
})

/** The transcript's style. */
const transcriptStyle = (): Record<string, string> => ({
  flex: '1',
  'overflow-y': 'auto',
  padding: '12px',
  background: '#f9fafb',
})

/** The empty-state paragraph's style. */
const emptyStyle = (): Record<string, string> => ({
  color: '#6b7280',
  'font-size': '14px',
  margin: '0',
})

/** The error paragraph's style. */
const errorStyle = (): Record<string, string> => ({
  color: '#b91c1c',
  'font-size': '13px',
  'margin-top': '8px',
})

/** The composer form's style. */
const composerStyle = (): Record<string, string> => ({
  'border-top': '1px solid #e5e7eb',
  padding: '8px',
  display: 'flex',
  gap: '8px',
  'align-items': 'flex-end',
  background: '#ffffff',
})

/** The composer textarea's style. */
const inputStyle = (): Record<string, string> => ({
  flex: '1',
  resize: 'none',
  padding: '8px 10px',
  border: '1px solid #d1d5db',
  'border-radius': '8px',
  'min-height': '36px',
  'max-height': '120px',
  'font-family': 'inherit',
  'font-size': '14px',
  color: '#111827',
  background: '#ffffff',
  outline: 'none',
})

/**
 * The send button's style.
 *
 * @param config - The widget config (its theme colours the button).
 * @param canSend - Whether the button is enabled (drives the opacity).
 * @returns The style declarations.
 */
const sendBtnStyle = (
  config: EmbeddableChatWidgetConfig,
  canSend: boolean,
): Record<string, string> => ({
  background: config.theme?.primaryColor ?? '#2563eb',
  color: config.theme?.primaryForegroundColor ?? '#ffffff',
  border: 'none',
  'border-radius': '8px',
  padding: '8px 14px',
  cursor: 'pointer',
  'font-size': '14px',
  'font-weight': '600',
  opacity: canSend ? '1' : '0.6',
})

/**
 * The panel section's style.
 *
 * @param position - The floating corner.
 * @returns The style declarations.
 */
const panelStyle = (position: EmbeddableChatWidgetPosition): Record<string, string> => ({
  position: 'fixed',
  width: '360px',
  height: '540px',
  'max-width': 'calc(100vw - 32px)',
  'max-height': 'calc(100vh - 32px)',
  'border-radius': '16px',
  overflow: 'hidden',
  'box-shadow': '0 12px 32px rgba(0, 0, 0, 0.22)',
  'z-index': '2147483647',
  background: '#ffffff',
  color: '#111827',
  display: 'flex',
  'flex-direction': 'column',
  'font-family':
    'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
  ...(position === 'bottom-left'
    ? { left: '24px', bottom: '24px' }
    : { right: '24px', bottom: '24px' }),
})

/** Props for {@link EmbeddableChatPanel}. */
export interface EmbeddableChatPanelProps {
  /** Whether the panel is expanded (visible) or collapsed (hidden). */
  visible: boolean
  /** Close handler — collapses back to launcher. */
  onClose: (event: MouseEvent) => void
  /** Floating corner. */
  position: EmbeddableChatWidgetPosition
  /** Resolved widget config. */
  config: EmbeddableChatWidgetConfig
}

/** Props for the panel's internal message bubble. */
export interface PanelMessageProps {
  message: EmbeddableChatMessage
  theme: EmbeddableChatWidgetConfig['theme']
}

/**
 * Single message bubble inside the panel transcript. Self-contained
 * styles so the widget doesn't depend on the host page's CSS.
 *
 * @param props - Component props (see {@link PanelMessageProps}).
 * @returns The rendered message bubble.
 */
const PanelMessage: Component<PanelMessageProps> = (props) => {
  const isSelf = (): boolean => props.message.role === 'user'
  return (
    <div
      style={messageWrapperStyle(isSelf())}
      data-mol-id={`embeddable-chat-message-${props.message.role}`}
    >
      <div style={bubbleStyle(isSelf(), props.theme)}>{props.message.body || ' '}</div>
    </div>
  )
}

/**
 * Inline three-dot typing indicator, scoped to the widget so it never
 * collides with anything on the host page.
 *
 * @param props - The label props.
 * @returns The rendered typing indicator.
 */
const PanelTyping: Component<{ label: string }> = (props) => {
  return (
    <div
      role="status"
      aria-label={props.label}
      data-mol-id="embeddable-chat-typing"
      style={typingWrapperStyle()}
    >
      <style>{TYPING_CSS}</style>
      <span aria-hidden="true" style={dotStyle(0)} />
      <span aria-hidden="true" style={dotStyle(150)} />
      <span aria-hidden="true" style={dotStyle(300)} />
    </div>
  )
}

/**
 * Expanded chat panel — header + scrollable message list + composer.
 *
 * State is local — each open conversation lives in `messages`. The widget
 * is intentionally storage-agnostic; integrations that want persistence
 * should wrap this with their own resume logic.
 */
export const EmbeddableChatPanel: Component<EmbeddableChatPanelProps> = (props) => {
  const { t } = useSafeTranslation()
  const [input, setInput] = createSignal('')
  const [messages, setMessages] = createSignal<EmbeddableChatMessage[]>([])
  const [isStreaming, setIsStreaming] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)
  // Assigned by the `ref` callback below during render, before any effect runs.
  let transcriptRef: HTMLDivElement | undefined

  // Auto-scroll the transcript when content changes.
  createEffect(() => {
    void messages()
    void isStreaming()
    if (transcriptRef) transcriptRef.scrollTop = transcriptRef.scrollHeight
  })

  /**
   * Submits the current input value to the backend, appends a user
   * message and an empty assistant placeholder, and streams the response
   * into the placeholder until the server signals done or errors.
   */
  async function handleSubmit(event?: Event): Promise<void> {
    event?.preventDefault()
    const text = input().trim()
    if (!text || isStreaming()) return
    setInput('')
    setError(null)
    const now = Date.now()
    const userMsg: EmbeddableChatMessage = {
      id: `u-${now}`,
      role: 'user',
      body: text,
      timestamp: now,
    }
    const assistantId = `a-${now}`
    const assistantMsg: EmbeddableChatMessage = {
      id: assistantId,
      role: 'assistant',
      body: '',
      timestamp: now,
    }
    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setIsStreaming(true)
    try {
      await sendChatRequest({
        message: text,
        config: props.config,
        onDelta: (delta) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, body: m.body + delta } : m)),
          )
        },
      })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(
              'embeddableChatWidget.error.streamError',
              {},
              { defaultValue: 'Something went wrong. Please try again.' },
            ),
      )
    } finally {
      setIsStreaming(false)
    }
  }

  const headerLabel = (): string =>
    t(
      'embeddableChatWidget.panel.headerLabel',
      { brandName: props.config.brandName },
      { defaultValue: 'Chat with {{brandName}}' },
    )
  const closeLabel = (): string =>
    t('embeddableChatWidget.panel.closeLabel', {}, { defaultValue: 'Close chat' })
  const placeholder = (): string =>
    t('embeddableChatWidget.composer.placeholder', {}, { defaultValue: 'Type your message…' })
  const sendLabel = (): string =>
    t('embeddableChatWidget.composer.send', {}, { defaultValue: 'Send' })
  const emptyLabel = (): string =>
    t(
      'embeddableChatWidget.panel.emptyState',
      {},
      { defaultValue: 'Ask a question to get started.' },
    )
  const typingLabel = (): string =>
    t('embeddableChatWidget.panel.assistantTyping', {}, { defaultValue: 'Assistant is typing…' })
  const canSend = (): boolean => input().trim().length > 0 && !isStreaming()

  return (
    <Show when={props.visible}>
      <section
        role="dialog"
        aria-label={headerLabel()}
        data-mol-id="embeddable-chat-panel"
        style={panelStyle(props.position)}
      >
        <header style={headerStyle(props.config)}>
          <Show when={props.config.brandLogo}>
            <img src={props.config.brandLogo} alt="" aria-hidden="true" style={logoStyle()} />
          </Show>
          <strong style={headerTitleStyle()}>{headerLabel()}</strong>
          <button
            type="button"
            onClick={(event) => props.onClose(event)}
            aria-label={closeLabel()}
            data-mol-id="embeddable-chat-close"
            style={closeBtnStyle()}
          >
            ×
          </button>
        </header>

        <div
          ref={(el) => (transcriptRef = el)}
          style={transcriptStyle()}
          data-mol-id="embeddable-chat-transcript"
        >
          {messages().length === 0 ? (
            <p style={emptyStyle()}>{emptyLabel()}</p>
          ) : (
            messages().map((m) => <PanelMessage message={m} theme={props.config.theme} />)
          )}
          {isStreaming() ? <PanelTyping label={typingLabel()} /> : null}
          {error() ? (
            <p role="alert" data-mol-id="embeddable-chat-error" style={errorStyle()}>
              {error()}
            </p>
          ) : null}
        </div>

        <form
          onSubmit={(event) => {
            void handleSubmit(event)
          }}
          style={composerStyle()}
        >
          <textarea
            value={input()}
            onInput={(event) => setInput(event.currentTarget.value)}
            placeholder={placeholder()}
            aria-label={placeholder()}
            rows={1}
            data-mol-id="embeddable-chat-input"
            style={inputStyle()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void handleSubmit()
              }
            }}
          />
          <button
            type="submit"
            disabled={!canSend()}
            data-mol-id="embeddable-chat-send"
            style={sendBtnStyle(props.config, canSend())}
          >
            {sendLabel()}
          </button>
        </form>
      </section>
    </Show>
  )
}
