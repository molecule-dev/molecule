import type { CSSProperties, FormEvent, JSX } from 'react'
import { useEffect, useRef, useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { sendChatRequest } from './sendChatRequest.js'
import type {
  EmbeddableChatMessage,
  EmbeddableChatWidgetConfig,
  EmbeddableChatWidgetPosition,
} from './types.js'

export interface EmbeddableChatPanelProps {
  /** Whether the panel is expanded (visible) or collapsed (hidden). */
  visible: boolean
  /** Close handler — collapses back to launcher. */
  onClose: () => void
  /** Floating corner. */
  position: EmbeddableChatWidgetPosition
  /** Resolved widget config. */
  config: EmbeddableChatWidgetConfig
}

/**
 * Expanded chat panel — header + scrollable message list + composer.
 *
 * State is local — each open conversation lives in `messages`. The widget
 * is intentionally storage-agnostic; integrations that want persistence
 * should wrap this with their own resume logic.
 *
 * @param props - Component props (see {@link EmbeddableChatPanelProps}).
 */
export function EmbeddableChatPanel({
  visible,
  onClose,
  position,
  config,
}: EmbeddableChatPanelProps): JSX.Element | null {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<EmbeddableChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // Auto-scroll the transcript when content changes.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, isStreaming])

  if (!visible) return null

  const positionStyle: CSSProperties =
    position === 'bottom-left'
      ? { left: '24px', bottom: '24px' }
      : { right: '24px', bottom: '24px' }

  const panelStyle: CSSProperties = {
    position: 'fixed',
    width: '360px',
    height: '540px',
    maxWidth: 'calc(100vw - 32px)',
    maxHeight: 'calc(100vh - 32px)',
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 12px 32px rgba(0, 0, 0, 0.22)',
    zIndex: 2147483647,
    background: '#ffffff',
    color: '#111827',
    display: 'flex',
    flexDirection: 'column',
    fontFamily:
      'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
    ...positionStyle,
  }

  const headerStyle: CSSProperties = {
    background: config.theme?.primaryColor ?? '#2563eb',
    color: config.theme?.primaryForegroundColor ?? '#ffffff',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  }

  const closeBtnStyle: CSSProperties = {
    marginLeft: 'auto',
    background: 'transparent',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: '20px',
    lineHeight: 1,
    padding: '4px 8px',
  }

  const transcriptStyle: CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    padding: '12px',
    background: '#f9fafb',
  }

  const composerStyle: CSSProperties = {
    borderTop: '1px solid #e5e7eb',
    padding: '8px',
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-end',
    background: '#ffffff',
  }

  const inputStyle: CSSProperties = {
    flex: 1,
    resize: 'none',
    padding: '8px 10px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    minHeight: '36px',
    maxHeight: '120px',
    fontFamily: 'inherit',
    fontSize: '14px',
    color: '#111827',
    background: '#ffffff',
    outline: 'none',
  }

  const sendBtnStyle: CSSProperties = {
    background: config.theme?.primaryColor ?? '#2563eb',
    color: config.theme?.primaryForegroundColor ?? '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 14px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
  }

  /**
   * Submits the current input value to the backend, appends a user
   * message and an empty assistant placeholder, and streams the response
   * into the placeholder until the server signals done or errors.
   */
  async function handleSubmit(e?: FormEvent): Promise<void> {
    e?.preventDefault()
    const text = input.trim()
    if (!text || isStreaming) return
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
        config,
        onDelta: (delta) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, body: m.body + delta } : m)),
          )
        },
      })
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t(
              'embeddableChatWidget.error.streamError',
              {},
              { defaultValue: 'Something went wrong. Please try again.' },
            )
      setError(message)
    } finally {
      setIsStreaming(false)
    }
  }

  const headerLabel = t(
    'embeddableChatWidget.panel.headerLabel',
    { brandName: config.brandName },
    { defaultValue: 'Chat with {{brandName}}' },
  )
  const closeLabel = t('embeddableChatWidget.panel.closeLabel', {}, { defaultValue: 'Close chat' })
  const placeholder = t(
    'embeddableChatWidget.composer.placeholder',
    {},
    { defaultValue: 'Type your message…' },
  )
  const sendLabel = t('embeddableChatWidget.composer.send', {}, { defaultValue: 'Send' })
  const emptyLabel = t(
    'embeddableChatWidget.panel.emptyState',
    {},
    { defaultValue: 'Ask a question to get started.' },
  )
  const typingLabel = t(
    'embeddableChatWidget.panel.assistantTyping',
    {},
    { defaultValue: 'Assistant is typing…' },
  )

  return (
    <section
      role="dialog"
      aria-label={headerLabel}
      data-mol-id="embeddable-chat-panel"
      className={cm.cn()}
      style={panelStyle}
    >
      <header style={headerStyle}>
        {config.brandLogo ? (
          <img
            src={config.brandLogo}
            alt=""
            aria-hidden
            style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover' }}
          />
        ) : null}
        <strong style={{ fontSize: '14px' }}>{headerLabel}</strong>
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          data-mol-id="embeddable-chat-close"
          style={closeBtnStyle}
        >
          ×
        </button>
      </header>

      <div ref={scrollRef} style={transcriptStyle} data-mol-id="embeddable-chat-transcript">
        {messages.length === 0 ? (
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>{emptyLabel}</p>
        ) : (
          messages.map((m) => <PanelMessage key={m.id} message={m} theme={config.theme} />)
        )}
        {isStreaming ? <PanelTyping label={typingLabel} /> : null}
        {error ? (
          <p
            role="alert"
            data-mol-id="embeddable-chat-error"
            style={{ color: '#b91c1c', fontSize: '13px', marginTop: '8px' }}
          >
            {error}
          </p>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} style={composerStyle}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          rows={1}
          data-mol-id="embeddable-chat-input"
          style={inputStyle}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void handleSubmit()
            }
          }}
        />
        <button
          type="submit"
          disabled={!input.trim() || isStreaming}
          data-mol-id="embeddable-chat-send"
          style={{ ...sendBtnStyle, opacity: !input.trim() || isStreaming ? 0.6 : 1 }}
        >
          {sendLabel}
        </button>
      </form>
    </section>
  )
}

export interface PanelMessageProps {
  message: EmbeddableChatMessage
  theme: EmbeddableChatWidgetConfig['theme']
}

/**
 * Single message bubble inside the panel transcript. Self-contained
 * styles so the widget doesn't depend on the host page's CSS.
 *
 * @param props - Component props (see {@link EmbeddableChatPanelProps}).
 */
function PanelMessage({ message, theme }: PanelMessageProps): JSX.Element {
  const isSelf = message.role === 'user'
  const wrapperStyle: CSSProperties = {
    display: 'flex',
    justifyContent: isSelf ? 'flex-end' : 'flex-start',
    marginBottom: '8px',
  }
  const bubbleStyle: CSSProperties = {
    maxWidth: '80%',
    padding: '8px 12px',
    borderRadius: '14px',
    fontSize: '14px',
    lineHeight: 1.4,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    background: isSelf ? (theme?.primaryColor ?? '#2563eb') : '#ffffff',
    color: isSelf ? (theme?.primaryForegroundColor ?? '#ffffff') : '#111827',
    border: isSelf ? 'none' : '1px solid #e5e7eb',
  }
  return (
    <div style={wrapperStyle} data-mol-id={`embeddable-chat-message-${message.role}`}>
      <div style={bubbleStyle}>{message.body || ' '}</div>
    </div>
  )
}

/**
 * Inline three-dot typing indicator, scoped to the widget so it never
 * collides with anything on the host page.
 *
 * @param props - Component props (see {@link EmbeddableChatPanelProps}).
 */
function PanelTyping({ label }: { label: string }): JSX.Element {
  const dotStyle = (delay: number): CSSProperties => ({
    display: 'inline-block',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#9ca3af',
    margin: '0 2px',
    animation: 'molecule-embed-pulse 1.2s ease-in-out infinite',
    animationDelay: `${delay}ms`,
  })
  const css =
    '@keyframes molecule-embed-pulse { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }'
  return (
    <div
      role="status"
      aria-label={label}
      data-mol-id="embeddable-chat-typing"
      style={{ padding: '4px 4px 8px' }}
    >
      <style>{css}</style>
      <span aria-hidden style={dotStyle(0)} />
      <span aria-hidden style={dotStyle(150)} />
      <span aria-hidden style={dotStyle(300)} />
    </div>
  )
}
