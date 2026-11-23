/**
 * Expanded chat panel — header + scrollable message list + composer.
 * Angular counterpart of `@molecule/app-embeddable-chat-widget`'s
 * `EmbeddableChatPanel` — the same props (React names), the same DOM.
 *
 * @module
 */

import {
  afterRenderEffect,
  type AfterViewInit,
  Component,
  Directive,
  ElementRef,
  EventEmitter,
  inject,
  signal,
  ViewChild,
} from '@angular/core'

import {
  MolPlacement,
  placeElementBefore,
  setElementPresent,
  usePlacement,
} from '@molecule/app-angular'

import { sendChatRequest } from './sendChatRequest.js'
import type {
  EmbeddableChatMessage,
  EmbeddableChatWidgetConfig,
  EmbeddableChatWidgetPosition,
  EmbeddableChatWidgetTheme,
} from './types.js'
import { useSafeTranslation } from './useSafeTranslation.js'

/**
 * Injects a `<style>` element as the host's first child, at render time.
 *
 * A `<style>` element cannot be written in an Angular template (the
 * compiler strips it), so the typing indicator mounts this directive on
 * its wrapper `div`; Angular re-creates the div whenever visibility turns
 * back on, re-inserting the element each time, and it leaves the DOM with
 * the view when visibility turns off. The `mol-*` attribute is the mount
 * point only — DOM normalization strips `mol-*` attributes.
 */
@Directive({
  selector: '[mol-embed-style-tag]',
  standalone: true,
})
class EmbedStyleTag implements AfterViewInit {
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /** @inheritdoc */
  ngAfterViewInit(): void {
    const style = document.createElement('style')
    style.textContent = TYPING_CSS
    // A node this component created, not one Angular rendered, so it places it itself.
    this.host.nativeElement.insertBefore(style, this.host.nativeElement.firstChild)
  }
}

/** The inline `@keyframes` rule the typing dots animate with. */
const TYPING_CSS =
  '@keyframes molecule-embed-pulse { 0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1); } }'

/**
 * Single message bubble inside the panel transcript (React's internal
 * `PanelMessage`). Self-contained styles so the widget doesn't depend on
 * the host page's CSS.
 *
 * @param message - The message to render.
 * @param theme - The optional widget theme.
 * @returns The wrapper style map.
 */
function messageWrapperStyle(message: EmbeddableChatMessage): Record<string, string> {
  const isSelf = message.role === 'user'
  return {
    display: 'flex',
    'justify-content': isSelf ? 'flex-end' : 'flex-start',
    'margin-bottom': '8px',
  }
}

/**
 * The message bubble's style.
 *
 * @param message - The message to render.
 * @param theme - The optional widget theme.
 * @returns The style map.
 */
function bubbleStyle(
  message: EmbeddableChatMessage,
  theme: EmbeddableChatWidgetTheme | undefined,
): Record<string, string> {
  const isSelf = message.role === 'user'
  return {
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
  }
}

/**
 * One typing-indicator dot's style.
 *
 * @param delay - The animation delay in ms.
 * @returns The style map.
 */
function dotStyle(delay: number): Record<string, string> {
  return {
    display: 'inline-block',
    width: '6px',
    height: '6px',
    'border-radius': '50%',
    background: '#9ca3af',
    margin: '0 2px',
    animation: 'molecule-embed-pulse 1.2s ease-in-out infinite',
    'animation-delay': `${delay}ms`,
  }
}

/**
 * Expanded chat panel — header + scrollable message list + composer.
 *
 * State is local — each open conversation lives in `messages`. The widget
 * is intentionally storage-agnostic; integrations that want persistence
 * should wrap this with their own resume logic.
 *
 * React's root is the `<section>` when visible and nothing when hidden, so the
 * section renders immediately before the host's place when visible and the
 * host itself never appears in the page (React renders no wrapper element).
 * The React `onClose` callback prop is the Angular `close` output, emitting the
 * native click event. The typing indicator's `<style>` element is injected by
 * {@link EmbedStyleTag} (Angular's compiler strips `<style>` elements from
 * templates).
 */
@Component({
  selector: 'mol-embeddable-chat-panel',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [EmbedStyleTag],
  inputs: ['visible', 'position', 'config'],
  outputs: ['close'],
  // prettier-ignore
  template: `<section
      #root
      role="dialog"
      [attr.aria-label]="headerLabel()"
      data-mol-id="embeddable-chat-panel"
      [style]="panelStyle()"
    >
      <header [style]="headerStyle()">
        @if (config?.brandLogo) {
          <img [attr.src]="config.brandLogo" alt="" aria-hidden="true" [style]="logoStyle()" />
        }
        <strong [style]="headerTitleStyle()">{{ headerLabel() }}</strong>
        <button
          type="button"
          (click)="closeClick($event)"
          [attr.aria-label]="closeLabel()"
          data-mol-id="embeddable-chat-close"
          [style]="closeBtnStyle()"
          [style.background]="'transparent'"
        >
          ×
        </button>
      </header>

      <div
        #transcript
        [style]="transcriptStyle()"
        data-mol-id="embeddable-chat-transcript"
      >
        @if (messages().length === 0) {
          <p [style]="emptyStyle()">{{ emptyLabel() }}</p>
        } @else {
          @for (m of messages(); track m.id) {
            <div [style]="messageWrapperStyle(m)" [attr.data-mol-id]="'embeddable-chat-message-' + m.role">
              <div [style]="bubbleStyle(m)">{{ bubbleText(m) }}</div>
            </div>
          }
        }
        @if (isStreaming()) {
          <div
            role="status"
            mol-embed-style-tag
            [attr.aria-label]="typingLabel()"
            data-mol-id="embeddable-chat-typing"
            [style]="typingStyle()"
          >
            <span aria-hidden="true" [style]="dotStyle(0)"></span><span aria-hidden="true" [style]="dotStyle(150)"></span><span aria-hidden="true" [style]="dotStyle(300)"></span>
          </div>
        }
        @if (error()) {
          <p role="alert" data-mol-id="embeddable-chat-error" [style]="errorStyle()">{{ error() }}</p>
        }
      </div>

      <form (submit)="onSubmit($event)" [style]="composerStyle()">
        <textarea
          [value]="input()"
          (input)="onInput($event)"
          [attr.placeholder]="placeholderLabel()"
          [attr.aria-label]="placeholderLabel()"
          rows="1"
          data-mol-id="embeddable-chat-input"
          [style]="inputStyle()"
          (keydown)="onKeyDown($event)"
        ></textarea>
        <button
          type="submit"
          [disabled]="!canSend()"
          data-mol-id="embeddable-chat-send"
          [style]="sendBtnStyle()"
        >
          {{ sendLabel() }}
        </button>
      </form>
    </section>`,
})
export class EmbeddableChatPanel {
  /** Whether the panel is expanded (visible) or collapsed (hidden). */
  visible?: boolean
  /** Floating corner. */
  position?: EmbeddableChatWidgetPosition
  /** Resolved widget config. */
  config?: EmbeddableChatWidgetConfig

  /** The React `onClose` callback prop, as an Angular output. */
  readonly close = new EventEmitter<MouseEvent>()

  protected readonly t = useSafeTranslation().t

  protected readonly input = signal('')
  protected readonly messages = signal<EmbeddableChatMessage[]>([])
  protected readonly isStreaming = signal(false)
  protected readonly error = signal<string | null>(null)
  /** The scrolling transcript, once rendered. */
  @ViewChild('transcript') private transcript?: ElementRef<HTMLDivElement>
  /** The panel section (React's root, rendered beside the host when visible). */
  @ViewChild('root') private root?: ElementRef<HTMLElement>

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  constructor() {
    // React renders the section or nothing; either way its host is not in the page.
    usePlacement(() => {
      const section = this.root?.nativeElement
      if (!section) return
      if (this.visible ?? false) placeElementBefore(section, this.host.nativeElement)
      else setElementPresent(section, false)
      setElementPresent(this.host.nativeElement, false)
    })
    // Auto-scroll the transcript when content changes, after the DOM shows it (React's
    // `useEffect` on the same two values runs after commit; a component `effect` runs before
    // the view refreshes, so it would read the previous scroll height).
    afterRenderEffect(() => {
      void this.messages()
      void this.isStreaming()
      const el = this.transcript?.nativeElement
      if (el) el.scrollTop = el.scrollHeight
    })
  }

  /**
   * Emits the React `onClose` callback with the native click event.
   * @param event - The click.
   */
  closeClick(event: MouseEvent): void {
    this.close.emit(event)
  }

  /**
   * Handles the composer form's submit (React's `onSubmit`).
   * @param event - The submit event.
   */
  onSubmit(event: Event): void {
    void this.handleSubmit(event)
  }

  /**
   * Handles the textarea's input event.
   * @param event - The input event.
   */
  onInput(event: Event): void {
    this.input.set((event.target as HTMLTextAreaElement).value)
  }

  /**
   * Handles textarea key presses: Enter submits, Shift+Enter does not.
   * @param event - The keydown event.
   */
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void this.handleSubmit()
    }
  }

  /**
   * Submits the current input value to the backend, appends a user
   * message and an empty assistant placeholder, and streams the response
   * into the placeholder until the server signals done or errors.
   */
  protected async handleSubmit(event?: Event): Promise<void> {
    event?.preventDefault()
    const text = this.input().trim()
    if (!text || this.isStreaming()) return
    this.input.set('')
    this.error.set(null)
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
    this.messages.set([...this.messages(), userMsg, assistantMsg])
    this.isStreaming.set(true)
    try {
      await sendChatRequest({
        message: text,
        config: this.config ?? { apiBaseUrl: '', brandName: '' },
        onDelta: (delta) => {
          this.messages.set(
            this.messages().map((m) => (m.id === assistantId ? { ...m, body: m.body + delta } : m)),
          )
        },
      })
    } catch (err) {
      this.error.set(
        err instanceof Error
          ? err.message
          : this.t(
              'embeddableChatWidget.error.streamError',
              {},
              { defaultValue: 'Something went wrong. Please try again.' },
            ),
      )
    } finally {
      this.isStreaming.set(false)
    }
  }

  /**
   * The header's translated label.
   * @returns The label.
   */
  headerLabel(): string {
    return this.t(
      'embeddableChatWidget.panel.headerLabel',
      { brandName: this.config?.brandName ?? '' },
      { defaultValue: 'Chat with {{brandName}}' },
    )
  }

  /**
   * The close button's translated accessible label.
   * @returns The label.
   */
  closeLabel(): string {
    return this.t('embeddableChatWidget.panel.closeLabel', {}, { defaultValue: 'Close chat' })
  }

  /**
   * The composer's translated placeholder.
   * @returns The placeholder.
   */
  placeholderLabel(): string {
    return this.t(
      'embeddableChatWidget.composer.placeholder',
      {},
      { defaultValue: 'Type your message…' },
    )
  }

  /**
   * The send button's translated label.
   * @returns The label.
   */
  sendLabel(): string {
    return this.t('embeddableChatWidget.composer.send', {}, { defaultValue: 'Send' })
  }

  /**
   * The empty transcript's translated message.
   * @returns The message.
   */
  emptyLabel(): string {
    return this.t(
      'embeddableChatWidget.panel.emptyState',
      {},
      { defaultValue: 'Ask a question to get started.' },
    )
  }

  /**
   * The typing indicator's translated accessible label.
   * @returns The label.
   */
  typingLabel(): string {
    return this.t(
      'embeddableChatWidget.panel.assistantTyping',
      {},
      { defaultValue: 'Assistant is typing…' },
    )
  }

  /**
   * Whether the composer can send (text present and not streaming).
   * @returns True when send is enabled.
   */
  canSend(): boolean {
    return this.input().trim().length > 0 && !this.isStreaming()
  }

  /**
   * The message bubble's text (React's `{message.body || ' '}`).
   * @param m - The message.
   * @returns The body, or one space for an empty body.
   */
  bubbleText(m: EmbeddableChatMessage): string {
    return m.body || ' '
  }

  /**
   * A message bubble's wrapper style (template accessor; template context
   * reaches only instance members).
   * @param m - The message.
   * @returns The wrapper style map.
   */
  messageWrapperStyle(m: EmbeddableChatMessage): Record<string, string> {
    return messageWrapperStyle(m)
  }

  /**
   * A message bubble's style (template accessor).
   * @param m - The message.
   * @returns The bubble style map.
   */
  bubbleStyle(m: EmbeddableChatMessage): Record<string, string> {
    return bubbleStyle(m, this.config?.theme)
  }

  /**
   * One typing-indicator dot's style (template accessor).
   * @param delay - The animation delay in ms.
   * @returns The dot style map.
   */
  dotStyle(delay: number): Record<string, string> {
    return dotStyle(delay)
  }

  /**
   * The panel section's inline style.
   * @returns The style map.
   */
  panelStyle(): Record<string, string> {
    const positionStyle: Record<string, string> =
      this.position === 'bottom-left'
        ? { left: '24px', bottom: '24px' }
        : { right: '24px', bottom: '24px' }
    return {
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
      ...positionStyle,
    }
  }

  /**
   * The header's inline style.
   * @returns The style map.
   */
  headerStyle(): Record<string, string> {
    return {
      background: this.config?.theme?.primaryColor ?? '#2563eb',
      color: this.config?.theme?.primaryForegroundColor ?? '#ffffff',
      padding: '12px 16px',
      display: 'flex',
      'align-items': 'center',
      gap: '12px',
    }
  }

  /**
   * The brand logo's inline style.
   * @returns The style map.
   */
  logoStyle(): Record<string, string> {
    return {
      width: '24px',
      height: '24px',
      'border-radius': '4px',
      'object-fit': 'cover',
    }
  }

  /**
   * The header title's inline style.
   * @returns The style map.
   */
  headerTitleStyle(): Record<string, string> {
    return { 'font-size': '14px' }
  }

  /**
   * The close button's inline style, minus its background: the background is
   * a separate `[style.background]` binding, because a whole-map apply drops
   * the shorthand's `transparent` value while a property set keeps it.
   * @returns The style map.
   */
  closeBtnStyle(): Record<string, string> {
    return {
      'margin-left': 'auto',
      border: 'none',
      color: 'inherit',
      cursor: 'pointer',
      'font-size': '20px',
      'line-height': '1',
      padding: '4px 8px',
    }
  }

  /**
   * The transcript's inline style.
   * @returns The style map.
   */
  transcriptStyle(): Record<string, string> {
    return {
      flex: '1',
      'overflow-y': 'auto',
      padding: '12px',
      background: '#f9fafb',
    }
  }

  /**
   * The empty-state paragraph's inline style.
   * @returns The style map.
   */
  emptyStyle(): Record<string, string> {
    return {
      color: '#6b7280',
      'font-size': '14px',
      margin: '0',
    }
  }

  /**
   * The error paragraph's inline style.
   * @returns The style map.
   */
  errorStyle(): Record<string, string> {
    return {
      color: '#b91c1c',
      'font-size': '13px',
      'margin-top': '8px',
    }
  }

  /**
   * The typing indicator's wrapper inline style.
   * @returns The style map.
   */
  typingStyle(): Record<string, string> {
    return { padding: '4px 4px 8px' }
  }

  /**
   * The composer form's inline style.
   * @returns The style map.
   */
  composerStyle(): Record<string, string> {
    return {
      'border-top': '1px solid #e5e7eb',
      padding: '8px',
      display: 'flex',
      gap: '8px',
      'align-items': 'flex-end',
      background: '#ffffff',
    }
  }

  /**
   * The composer textarea's inline style.
   * @returns The style map.
   */
  inputStyle(): Record<string, string> {
    return {
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
    }
  }

  /**
   * The send button's inline style.
   * @returns The style map.
   */
  sendBtnStyle(): Record<string, string> {
    return {
      background: this.config?.theme?.primaryColor ?? '#2563eb',
      color: this.config?.theme?.primaryForegroundColor ?? '#ffffff',
      border: 'none',
      'border-radius': '8px',
      padding: '8px 14px',
      cursor: 'pointer',
      'font-size': '14px',
      'font-weight': '600',
      opacity: this.canSend() ? '1' : '0.6',
    }
  }
}
