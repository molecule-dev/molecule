/**
 * Expanded chat panel — header + scrollable message list + composer.
 * Vue counterpart of `@molecule/app-embeddable-chat-widget`'s
 * `EmbeddableChatPanel` — the same props (React names), the same DOM.
 *
 * @module
 */

import {
  type ComponentPublicInstance,
  defineComponent,
  type DirectiveBinding,
  h,
  type PropType,
  type Ref,
  ref,
  type VNode,
  watch,
  withDirectives,
} from 'vue'

import { sendChatRequest } from './sendChatRequest.js'
import type {
  EmbeddableChatMessage,
  EmbeddableChatWidgetConfig,
  EmbeddableChatWidgetPosition,
  EmbeddableChatWidgetTheme,
} from './types.js'
import { useSafeTranslation } from './useSafeTranslation.js'

/** Props for {@link EmbeddableChatPanel}. */
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

/** Props for the panel's internal message bubble. */
export interface PanelMessageProps {
  message: EmbeddableChatMessage
  theme: EmbeddableChatWidgetConfig['theme']
}

/**
 * Keeps the composer textarea's value on the DOM property (React's
 * controlled-`value` behavior). Vue would otherwise mirror the value onto
 * the `value` ATTRIBUTE, which a rendered page must not carry.
 */
const controlledValue = {
  /**
   * Puts the state value on the DOM property when the textarea mounts.
   *
   * @param el - The textarea.
   * @param binding - The directive binding (its value is the state value).
   */
  mounted: (el: HTMLTextAreaElement, binding: DirectiveBinding<string>): void => {
    el.value = binding.value
  },
  /**
   * Keeps the DOM property on the state value at updates.
   *
   * @param el - The textarea.
   * @param binding - The directive binding (its value is the state value).
   */
  updated: (el: HTMLTextAreaElement, binding: DirectiveBinding<string>): void => {
    // Only when state differs from the DOM: typing must not fight the user's cursor.
    if (el.value !== binding.value) el.value = binding.value
  },
}

/**
 * Single message bubble inside the panel transcript. Self-contained
 * styles so the widget doesn't depend on the host page's CSS.
 */
const PanelMessage = defineComponent({
  name: 'PanelMessage',
  props: {
    message: { type: Object as PropType<EmbeddableChatMessage>, required: true },
    theme: { type: Object as PropType<EmbeddableChatWidgetTheme>, default: undefined },
  },
  setup(props) {
    return (): VNode => {
      const isSelf = props.message.role === 'user'
      const wrapperStyle: Record<string, string> = {
        display: 'flex',
        justifyContent: isSelf ? 'flex-end' : 'flex-start',
        marginBottom: '8px',
      }
      const bubbleStyle: Record<string, string> = {
        maxWidth: '80%',
        padding: '8px 12px',
        borderRadius: '14px',
        fontSize: '14px',
        lineHeight: '1.4',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        background: isSelf ? (props.theme?.primaryColor ?? '#2563eb') : '#ffffff',
        color: isSelf ? (props.theme?.primaryForegroundColor ?? '#ffffff') : '#111827',
        border: isSelf ? 'none' : '1px solid #e5e7eb',
      }
      return h(
        'div',
        {
          style: wrapperStyle,
          'data-mol-id': `embeddable-chat-message-${props.message.role}`,
        },
        [h('div', { style: bubbleStyle }, [props.message.body || ' '])],
      )
    }
  },
})

/**
 * Inline three-dot typing indicator, scoped to the widget so it never
 * collides with anything on the host page.
 */
const PanelTyping = defineComponent({
  name: 'PanelTyping',
  props: {
    label: { type: String as PropType<string>, required: true },
  },
  setup(props) {
    return (): VNode => {
      const dotStyle = (delay: number): Record<string, string> => ({
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
      return h(
        'div',
        {
          role: 'status',
          'aria-label': props.label,
          'data-mol-id': 'embeddable-chat-typing',
          style: { padding: '4px 4px 8px' },
        },
        [
          h('style', css),
          h('span', { 'aria-hidden': 'true', style: dotStyle(0) }),
          h('span', { 'aria-hidden': 'true', style: dotStyle(150) }),
          h('span', { 'aria-hidden': 'true', style: dotStyle(300) }),
        ],
      )
    }
  },
})

/**
 * Expanded chat panel — header + scrollable message list + composer.
 *
 * State is local — each open conversation lives in `messages`. The widget
 * is intentionally storage-agnostic; integrations that want persistence
 * should wrap this with their own resume logic.
 *
 * The React `onClose` callback prop arrives as a Vue `close` event listener.
 */
export const EmbeddableChatPanel = defineComponent({
  name: 'EmbeddableChatPanel',
  props: {
    visible: { type: Boolean as PropType<boolean>, required: true },
    position: {
      type: String as PropType<EmbeddableChatWidgetPosition>,
      required: true,
    },
    config: { type: Object as PropType<EmbeddableChatWidgetConfig>, required: true },
  },
  emits: ['close'],
  setup(props, { emit }) {
    const { t } = useSafeTranslation()
    const input = ref('')
    const messages = ref<EmbeddableChatMessage[]>([])
    const isStreaming = ref(false)
    const error = ref<string | null>(null)
    const transcript: Ref<Element | ComponentPublicInstance | null> = ref(null)

    // Auto-scroll the transcript when content changes.
    watch([messages, isStreaming], () => {
      const value = transcript.value
      if (!value) return
      const el: Element | null =
        value instanceof Element ? value : ((value.$el as Element | null) ?? null)
      if (el instanceof HTMLElement) el.scrollTop = el.scrollHeight
    })

    /**
     * Submits the current input value to the backend, appends a user
     * message and an empty assistant placeholder, and streams the response
     * into the placeholder until the server signals done or errors.
     */
    async function handleSubmit(event?: Event): Promise<void> {
      event?.preventDefault()
      const text = input.value.trim()
      if (!text || isStreaming.value) return
      input.value = ''
      error.value = null
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
      messages.value = [...messages.value, userMsg, assistantMsg]
      isStreaming.value = true
      try {
        await sendChatRequest({
          message: text,
          config: props.config,
          onDelta: (delta) => {
            messages.value = messages.value.map((m) =>
              m.id === assistantId ? { ...m, body: m.body + delta } : m,
            )
          },
        })
      } catch (err) {
        error.value =
          err instanceof Error
            ? err.message
            : t(
                'embeddableChatWidget.error.streamError',
                {},
                { defaultValue: 'Something went wrong. Please try again.' },
              )
      } finally {
        isStreaming.value = false
      }
    }

    return (): VNode | null => {
      if (!props.visible) return null

      const positionStyle: Record<string, string> =
        props.position === 'bottom-left'
          ? { left: '24px', bottom: '24px' }
          : { right: '24px', bottom: '24px' }

      const panelStyle: Record<string, string | number> = {
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

      const headerStyle: Record<string, string> = {
        background: props.config.theme?.primaryColor ?? '#2563eb',
        color: props.config.theme?.primaryForegroundColor ?? '#ffffff',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }

      const closeBtnStyle: Record<string, string> = {
        marginLeft: 'auto',
        background: 'transparent',
        border: 'none',
        color: 'inherit',
        cursor: 'pointer',
        fontSize: '20px',
        lineHeight: '1',
        padding: '4px 8px',
      }

      const transcriptStyle: Record<string, string> = {
        flex: '1',
        overflowY: 'auto',
        padding: '12px',
        background: '#f9fafb',
      }

      const composerStyle: Record<string, string> = {
        borderTop: '1px solid #e5e7eb',
        padding: '8px',
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-end',
        background: '#ffffff',
      }

      const inputStyle: Record<string, string> = {
        flex: '1',
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

      const sendBtnStyle: Record<string, string> = {
        background: props.config.theme?.primaryColor ?? '#2563eb',
        color: props.config.theme?.primaryForegroundColor ?? '#ffffff',
        border: 'none',
        borderRadius: '8px',
        padding: '8px 14px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '600',
      }

      const headerLabel = t(
        'embeddableChatWidget.panel.headerLabel',
        { brandName: props.config.brandName },
        { defaultValue: 'Chat with {{brandName}}' },
      )
      const closeLabel = t(
        'embeddableChatWidget.panel.closeLabel',
        {},
        { defaultValue: 'Close chat' },
      )
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

      const canSend = input.value.trim().length > 0 && !isStreaming.value

      return h(
        'section',
        {
          role: 'dialog',
          'aria-label': headerLabel,
          'data-mol-id': 'embeddable-chat-panel',
          style: panelStyle,
        },
        [
          h('header', { style: headerStyle }, [
            props.config.brandLogo
              ? h('img', {
                  src: props.config.brandLogo,
                  alt: '',
                  'aria-hidden': 'true',
                  style: {
                    width: '24px',
                    height: '24px',
                    borderRadius: '4px',
                    objectFit: 'cover',
                  },
                })
              : null,
            h('strong', { style: { fontSize: '14px' } }, [headerLabel]),
            h(
              'button',
              {
                type: 'button',
                onClick: (event: MouseEvent) => emit('close', event),
                'aria-label': closeLabel,
                'data-mol-id': 'embeddable-chat-close',
                style: closeBtnStyle,
              },
              ['×'],
            ),
          ]),
          h(
            'div',
            {
              ref: transcript,
              style: transcriptStyle,
              'data-mol-id': 'embeddable-chat-transcript',
            },
            [
              messages.value.length === 0
                ? h('p', { style: { color: '#6b7280', fontSize: '14px', margin: 0 } }, [emptyLabel])
                : messages.value.map((m) =>
                    h(PanelMessage, { key: m.id, message: m, theme: props.config.theme }),
                  ),
              isStreaming.value ? h(PanelTyping, { label: typingLabel }) : null,
              error.value
                ? h(
                    'p',
                    {
                      role: 'alert',
                      'data-mol-id': 'embeddable-chat-error',
                      style: { color: '#b91c1c', fontSize: '13px', marginTop: '8px' },
                    },
                    [error.value],
                  )
                : null,
            ],
          ),
          h(
            'form',
            {
              onSubmit: (event: Event) => {
                void handleSubmit(event)
              },
              style: composerStyle,
            },
            [
              withDirectives(
                h('textarea', {
                  onInput: (event: Event) => {
                    input.value = (event.target as HTMLTextAreaElement).value
                  },
                  placeholder,
                  'aria-label': placeholder,
                  rows: 1,
                  'data-mol-id': 'embeddable-chat-input',
                  style: inputStyle,
                  onKeydown: (event: KeyboardEvent) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      void handleSubmit()
                    }
                  },
                }),
                [[controlledValue, input.value]],
              ),
              h(
                'button',
                {
                  type: 'submit',
                  disabled: !canSend,
                  'data-mol-id': 'embeddable-chat-send',
                  style: { ...sendBtnStyle, opacity: canSend ? 1 : 0.6 },
                },
                [sendLabel],
              ),
            ],
          ),
        ],
      )
    }
  },
})
