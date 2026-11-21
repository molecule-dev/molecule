<!--
  EmbeddableChatPanel: the Svelte counterpart of
  `@molecule/app-embeddable-chat-widget`'s `EmbeddableChatPanel` — expanded
  chat panel: header + scrollable message list + composer with streaming.
  Same props (React names), same DOM for the same input. State is local —
  each open conversation lives in `messages`; the widget is intentionally
  storage-agnostic.
-->
<script lang="ts">
  import { sendChatRequest } from './sendChatRequest.js'
  import type {
    EmbeddableChatMessage,
    EmbeddableChatPanelProps,
    PanelMessageProps,
  } from './types.js'
  import { useSafeTranslation } from './useSafeTranslation.js'

  let { visible, onClose, position, config }: EmbeddableChatPanelProps = $props()

  const { t } = useSafeTranslation()

  let input = $state('')
  let messages = $state<EmbeddableChatMessage[]>([])
  let isStreaming = $state(false)
  let error = $state<string | null>(null)
  let transcript: HTMLDivElement | undefined = $state()

  const headerLabel = $derived(
    t(
      'embeddableChatWidget.panel.headerLabel',
      { brandName: config.brandName },
      { defaultValue: 'Chat with {{brandName}}' },
    ),
  )
  const closeLabel = $derived(
    t('embeddableChatWidget.panel.closeLabel', {}, { defaultValue: 'Close chat' }),
  )
  const placeholderLabel = $derived(
    t('embeddableChatWidget.composer.placeholder', {}, { defaultValue: 'Type your message…' }),
  )
  const sendLabel = $derived(t('embeddableChatWidget.composer.send', {}, { defaultValue: 'Send' }))
  const emptyLabel = $derived(
    t(
      'embeddableChatWidget.panel.emptyState',
      {},
      { defaultValue: 'Ask a question to get started.' },
    ),
  )
  const typingLabel = $derived(
    t('embeddableChatWidget.panel.assistantTyping', {}, { defaultValue: 'Assistant is typing…' }),
  )

  const canSend = $derived(input.trim().length > 0 && !isStreaming)

  // Auto-scroll the transcript when content changes.
  $effect(() => {
    void messages
    void isStreaming
    if (transcript) transcript.scrollTop = transcript.scrollHeight
  })

  /**
   * The panel section's inline style (a bound expression so the DOM parses
   * each value exactly as React's inline-style object does).
   *
   * @returns The style declarations.
   */
  const panelStyle = (): string =>
    [
      `position: fixed`,
      `width: 360px`,
      `height: 540px`,
      `max-width: calc(100vw - 32px)`,
      `max-height: calc(100vh - 32px)`,
      `border-radius: 16px`,
      `overflow: hidden`,
      `box-shadow: 0 12px 32px rgba(0, 0, 0, 0.22)`,
      `z-index: 2147483647`,
      `background: #ffffff`,
      `color: #111827`,
      `display: flex`,
      `flex-direction: column`,
      `font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"`,
      position === 'bottom-left' ? `left: 24px` : `right: 24px`,
      `bottom: 24px`,
    ].join('; ')

  /**
   * The header's inline style.
   *
   * @returns The style declarations.
   */
  const headerStyle = (): string =>
    [
      `background: ${config.theme?.primaryColor ?? '#2563eb'}`,
      `color: ${config.theme?.primaryForegroundColor ?? '#ffffff'}`,
      `padding: 12px 16px`,
      `display: flex`,
      `align-items: center`,
      `gap: 12px`,
    ].join('; ')

  /** The brand logo's inline style. */
  const logoStyle = `width: 24px; height: 24px; border-radius: 4px; object-fit: cover`

  /** The header title's inline style. */
  const headerTitleStyle = `font-size: 14px`

  /**
   * The close button's inline style, minus its background: the background is
   * a per-property `style:` directive below, because a cssText assignment
   * drops the shorthand's `transparent` value while a property set keeps it.
   */
  const closeBtnStyle = `margin-left: auto; border: none; color: inherit; cursor: pointer; font-size: 20px; line-height: 1; padding: 4px 8px`

  /** The transcript's inline style. */
  const transcriptStyle = `flex: 1; overflow-y: auto; padding: 12px; background: #f9fafb`

  /** The empty-state paragraph's inline style. */
  const emptyStyle = `color: #6b7280; font-size: 14px; margin: 0`

  /** The error paragraph's inline style. */
  const errorStyle = `color: #b91c1c; font-size: 13px; margin-top: 8px`

  /** The composer form's inline style. */
  const composerStyle = `border-top: 1px solid #e5e7eb; padding: 8px; display: flex; gap: 8px; align-items: flex-end; background: #ffffff`

  /** The composer textarea's inline style. */
  const textareaStyle = `flex: 1; resize: none; padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 8px; min-height: 36px; max-height: 120px; font-family: inherit; font-size: 14px; color: #111827; background: #ffffff; outline: none`

  /** The typing indicator's wrapper inline style. */
  const typingStyle = `padding: 4px 4px 8px`

  /** The `@keyframes` rule the typing dots animate with. */
  const typingCss =
    '@keyframes molecule-embed-pulse { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }'

  /**
   * One typing-indicator dot's inline style.
   *
   * @param delay - The animation delay in ms.
   * @returns The style declarations.
   */
  const dotStyle = (delay: number): string =>
    `display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #9ca3af; margin: 0 2px; animation: molecule-embed-pulse 1.2s ease-in-out infinite; animation-delay: ${delay}ms`

  /**
   * A message bubble's wrapper inline style (alignment by role).
   *
   * @param isSelf - Whether the message is the user's.
   * @returns The style declarations.
   */
  const messageWrapperStyle = (isSelf: boolean): string =>
    `display: flex; justify-content: ${isSelf ? 'flex-end' : 'flex-start'}; margin-bottom: 8px`

  /**
   * A message bubble's inline style (React's `PanelMessage`: the bubble
   * reads the `theme` prop its caller passed, not the config directly).
   *
   * @param isSelf - Whether the message is the user's.
   * @param theme - The optional widget theme the panel passed down.
   * @returns The style declarations.
   */
  const bubbleStyle = (isSelf: boolean, theme: PanelMessageProps['theme']): string =>
    [
      `max-width: 80%`,
      `padding: 8px 12px`,
      `border-radius: 14px`,
      `font-size: 14px`,
      `line-height: 1.4`,
      `white-space: pre-wrap`,
      `word-break: break-word`,
      `background: ${isSelf ? (theme?.primaryColor ?? '#2563eb') : '#ffffff'}`,
      `color: ${isSelf ? (theme?.primaryForegroundColor ?? '#ffffff') : '#111827'}`,
      `border: ${isSelf ? 'none' : '1px solid #e5e7eb'}`,
    ].join('; ')

  /**
   * The send button's inline style (the enabled state drives the opacity).
   *
   * @returns The style declarations.
   */
  const sendBtnStyle = (): string =>
    [
      `background: ${config.theme?.primaryColor ?? '#2563eb'}`,
      `color: ${config.theme?.primaryForegroundColor ?? '#ffffff'}`,
      `border: none`,
      `border-radius: 8px`,
      `padding: 8px 14px`,
      `cursor: pointer`,
      `font-size: 14px`,
      `font-weight: 600`,
      `opacity: ${canSend ? '1' : '0.6'}`,
    ].join('; ')

  /**
   * Submits the current input value to the backend, appends a user
   * message and an empty assistant placeholder, and streams the response
   * into the placeholder until the server signals done or errors.
   *
   * @param event - The submitting form's submit event, when one exists.
   */
  async function handleSubmit(event?: Event): Promise<void> {
    event?.preventDefault()
    const text = input.trim()
    if (!text || isStreaming) return
    input = ''
    error = null
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
    messages = [...messages, userMsg, assistantMsg]
    isStreaming = true
    try {
      await sendChatRequest({
        message: text,
        config,
        onDelta: (delta) => {
          messages = messages.map((m) =>
            m.id === assistantId ? { ...m, body: m.body + delta } : m,
          )
        },
      })
    } catch (err) {
      error =
        err instanceof Error
          ? err.message
          : t(
              'embeddableChatWidget.error.streamError',
              {},
              { defaultValue: 'Something went wrong. Please try again.' },
            )
    } finally {
      isStreaming = false
    }
  }
</script>

{#snippet messageBubble(props: PanelMessageProps)}
  <!-- React's internal `PanelMessage` bubble. One line on purpose: Svelte
       preserves template whitespace, and React emits no text nodes here
       (prettier-ignore keeps the DOM exactly React's). -->
  <!-- prettier-ignore -->
  <div style={messageWrapperStyle(props.message.role === 'user')} data-mol-id={`embeddable-chat-message-${props.message.role}`}><div style={bubbleStyle(props.message.role === 'user', props.theme)}>{props.message.body || ' '}</div></div>
{/snippet}

{#if visible}
  <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
  <!-- React renders `<section role="dialog">` — the role is the widget's
       accessible name target, not an interactive-element claim. -->
  <section
    role="dialog"
    aria-label={headerLabel}
    data-mol-id="embeddable-chat-panel"
    style={panelStyle()}
  >
    <header style={headerStyle()}>
      {#if config.brandLogo}
        <img src={config.brandLogo} alt="" aria-hidden="true" style={logoStyle} />
      {/if}
      <strong style={headerTitleStyle}>{headerLabel}</strong>
      <button
        type="button"
        onclick={(event) => onClose(event)}
        aria-label={closeLabel}
        data-mol-id="embeddable-chat-close"
        style={closeBtnStyle}
        style:background="transparent"
      >
        ×
      </button>
    </header>

    <div bind:this={transcript} style={transcriptStyle} data-mol-id="embeddable-chat-transcript">
      {#if messages.length === 0}
        <p style={emptyStyle}>{emptyLabel}</p>
      {:else}
        {#each messages as m (m.id)}
          {@render messageBubble({ message: m, theme: config.theme })}
        {/each}
      {/if}
      {#if isStreaming}
        <div
          role="status"
          aria-label={typingLabel}
          data-mol-id="embeddable-chat-typing"
          style={typingStyle}
        >
          <!-- React renders `<style>{css}</style>`: the keyframes are the
               style element's exact text, so the element is built at runtime
               (`<svelte:element>`) rather than as template raw text, which
               whitespace-preserving formatting would surround with newlines. -->
          <svelte:element this={"style"}>{typingCss}</svelte:element><span
            aria-hidden="true"
            style={dotStyle(0)}
          ></span><span aria-hidden="true" style={dotStyle(150)}></span><span
            aria-hidden="true"
            style={dotStyle(300)}
          ></span>
        </div>
      {/if}
      {#if error}
        <p role="alert" data-mol-id="embeddable-chat-error" style={errorStyle}>{error}</p>
      {/if}
    </div>

    <form
      onsubmit={(event) => {
        void handleSubmit(event)
      }}
      style={composerStyle}
    >
      <textarea
        bind:value={input}
        placeholder={placeholderLabel}
        aria-label={placeholderLabel}
        rows="1"
        data-mol-id="embeddable-chat-input"
        style={textareaStyle}
        onkeydown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            void handleSubmit()
          }
        }}></textarea>
      <button
        type="submit"
        disabled={!canSend}
        data-mol-id="embeddable-chat-send"
        style={sendBtnStyle()}
      >
        {sendLabel}
      </button>
    </form>
  </section>
{/if}
