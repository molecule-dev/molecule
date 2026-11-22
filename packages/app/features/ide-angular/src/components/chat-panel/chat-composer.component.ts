/**
 * React's render section “Input container — matches user message card style”
 * (ChatPanel.tsx lines 8282–8800): the composer card with its textarea, the
 * hint row's plan / fast-mode / mic / attach / glyph buttons and the context
 * ring with the stop and send controls.
 *
 * Angular counterpart of that section: the same DOM for the same input, the
 * same ClassMap classes and inline styles, the same direct hover mutations
 * (every button writes its own `style.opacity`), and the same callbacks. The
 * host element IS React's root `<div>` (its class, `hidden`, `data-mol-id`,
 * `role`, `data-mol-viewer`, style and click handler), so the port adds no
 * node.
 *
 * Every inline style is a `[style]` map binding holding React's own style
 * object, so each declaration is applied through the DOM's CSS parser exactly
 * the way React applies its style object (`border: none` lands as React's
 * `border: medium`, `#d97706` as `rgb(217, 119, 6)`, unitless numbers stay
 * unitless). The textarea is uncontrolled: the composer slice's `inputRef`
 * holds the live text and its `initialDraft` only seeds the element, so a
 * keystroke never re-renders the panel. The section publishes the textarea to
 * the composer slice's ref when its view is created, which is before
 * `ChatInner`'s mount pass and before any effect runs.
 *
 * @module
 */

import { type AfterViewInit, Component, type ElementRef, inject, ViewChild } from '@angular/core'

import type { ContextUsage } from '@molecule/app-ai-chat'
import { NOTICE_TONE } from '@molecule/app-ide-panel-logic'
import { getLogger } from '@molecule/app-logger'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { ContextUsageIndicator } from '../../parts/context-usage-indicator.component.js'
import { ChatAttachments } from './chat-attachments.slice.js'
import { ChatChat } from './chat-chat.slice.js'
import { ChatComposer } from './chat-composer.slice.js'
import { ChatContextUsage } from './chat-context-usage.slice.js'
import { ChatInnerState } from './chat-inner-state.js'
import { ChatInput } from './chat-input.slice.js'
import { ChatOverlay } from './chat-overlay.slice.js'
import { ChatPickers } from './chat-pickers.slice.js'
import { ChatPopups } from './chat-popups.slice.js'
import { ChatRenderHandlers } from './chat-render-handlers.slice.js'
import { ChatSubmit } from './chat-submit.slice.js'
import { ChatSystemCards } from './chat-system-cards.slice.js'
import { ChatTimeline } from './chat-timeline.slice.js'
import { ChatVoice } from './chat-voice.slice.js'

/** The module-level logger (React's `getLogger('chat-panel')`). */
const logger = getLogger('chat-panel')

/** One element's inline style, in React's style-object shape. */
type StyleObject = Record<string, unknown>

/**
 * React's “Input container — matches user message card style” section: the
 * composer card and its hint row.
 */
@Component({
  selector: 'div[mol-chat-composer]',
  standalone: true,
  imports: [ContextUsageIndicator],
  host: {
    '[class]': 'rootClass()',
    '[attr.hidden]': 'hiddenAttr()',
    'data-mol-id': 'chat-composer',
    role: 'presentation',
    '[attr.data-mol-viewer]': 'viewerAttr()',
    '[style]': 'rootStyle()',
    '(click)': 'onContainerClick($event)',
  },
  // prettier-ignore
  template: `<textarea #ta data-mol-chat-input="" [attr.aria-label]="inputLabel()" [value]="composer.initialDraft()" autocomplete="off" (input)="input.handleInputChange($event)" (paste)="attachments.handlePaste($event)" [attr.placeholder]="placeholder()" rows="1" [class]="cm.textSize('sm')" [style]="textareaStyle()"></textarea><div style="display: flex; align-items: center; margin-top: 6px; gap: 4px">@if (canEdit() !== false) {<button type="button" (click)="toggleMode()" [attr.title]="modeTitle()" [style]="modeStyle()" (mouseenter)="onModeEnter($event)" (mouseleave)="onModeLeave($event)"><svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1.5c-2.363 0-4 1.69-4 3.75 0 .984.424 1.625.984 2.304l.214.253c.223.264.47.556.673.848.284.411.537.896.621 1.49a.75.75 0 0 1-1.484.211c-.04-.282-.163-.547-.37-.847a8.456 8.456 0 0 0-.542-.68c-.084-.1-.173-.205-.268-.32C3.201 7.75 2.5 6.766 2.5 5.25 2.5 2.31 4.863 0 8 0s5.5 2.31 5.5 5.25c0 1.516-.701 2.5-1.328 3.259-.095.115-.184.22-.268.319-.207.245-.383.453-.541.681-.208.3-.33.565-.37.847a.751.751 0 0 1-1.485-.212c.084-.593.337-1.078.621-1.489.203-.292.45-.584.673-.848.075-.088.147-.173.213-.253.561-.679.985-1.32.985-2.304 0-2.06-1.637-3.75-4-3.75ZM5.75 12h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1 0-1.5ZM6 15.25a.75.75 0 0 1 .75-.75h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1-.75-.75Z"></path></svg></button>}@if (fastModeAvailable() && canEdit() !== false) {<button type="button" data-mol-id="chat-fast-mode-toggle" [disabled]="!canEdit()" (click)="toggleFastMode()" [attr.title]="fastModeTitle()" [style]="fastModeStyle()" (mouseenter)="onFastModeEnter($event)" (mouseleave)="onFastModeLeave($event)"><svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M9.504.43a.75.75 0 0 1 .584.859l-.828 4.211h4.49a.75.75 0 0 1 .573 1.234l-7.25 8.5a.75.75 0 0 1-1.32-.658l.828-4.211H2.09a.75.75 0 0 1-.573-1.234l7.25-8.5a.75.75 0 0 1 .737-.201Z"></path></svg></button>}<button type="button" data-mol-id="chat-mic-button" (click)="voice.toggleVoice()" [attr.title]="micTitle()" [style]="micStyle()" (mouseenter)="onMicEnter($event)" (mouseleave)="onMicLeave($event)"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" style="display: block"><rect x="6" y="1" width="4" height="8" rx="2" [attr.fill]="voice.isListening() ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.25"></rect><path d="M4 7v1a4 4 0 008 0V7" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"></path><line x1="8" y1="12" x2="8" y2="15" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"></line><line x1="6" y1="15" x2="10" y2="15" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"></line></svg></button>@if (canEdit() !== false) {<button type="button" (click)="attachments.fileInputRef.current?.click()" [attr.title]="attachTitle()" [style]="attachStyle()" (mouseenter)="onAttachEnter($event)" (mouseleave)="onAttachLeave($event)"><svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" style="display: block"><path d="M12.212 3.02a1.753 1.753 0 0 0-2.478.003l-5.83 5.83a3.007 3.007 0 0 0-.88 2.127c0 .795.315 1.551.88 2.116.567.567 1.333.89 2.126.89.79 0 1.548-.321 2.116-.89l5.48-5.48a.75.75 0 0 1 1.061 1.06l-5.48 5.48a4.492 4.492 0 0 1-3.177 1.33c-1.2 0-2.345-.487-3.187-1.33a4.483 4.483 0 0 1-1.32-3.177c0-1.195.475-2.341 1.32-3.186l5.83-5.83a3.25 3.25 0 0 1 5.553 2.297c0 .863-.343 1.691-.953 2.301L7.439 12.39c-.375.377-.884.59-1.416.593a1.998 1.998 0 0 1-1.412-.593 1.992 1.992 0 0 1 0-2.828l5.48-5.48a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042l-5.48 5.48a.492.492 0 0 0 0 .707.499.499 0 0 0 .352.154.51.51 0 0 0 .356-.154l5.833-5.827a1.755 1.755 0 0 0 0-2.481Z"></path></svg></button>}@if (canEdit() !== false) {<button type="button" (click)="handlers.insertMentionAtCaret()" [attr.title]="mentionTitle()" [style]="glyphStyle()" (mouseenter)="onGlyphEnter($event)" (mouseleave)="onGlyphLeave($event)"><span style="position: relative; top: 0px">{{ '@' }}</span></button>}<button type="button" (click)="handlers.toggleSlashMenu()" [attr.title]="slashTitle()" [style]="glyphStyle()" (mouseenter)="onGlyphEnter($event)" (mouseleave)="onGlyphLeave($event)"><svg width="9" height="13" viewBox="0 0 9 13" style="display: block; position: relative; top: 1px"><line x1="8" y1="1" x2="1" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></line></svg></button>@if (contextUsageForRow(); as usage) {<div mol-context-usage-indicator [usage]="usage" [history]="contextUsage.contextHistory()" [compactions]="contextUsage.contextCompactions()" [projectId]="projectId()" [conversationId]="conversationId()" [onOpenSettings]="openSettings"></div>}<div [style]="sendClusterStyle()">@if (canEdit() !== false && (chat.isLoading() || chat.isRemoteStreaming())) {<button type="button" data-mol-id="chat-stop-button" (click)="chat.handleAbort()" [attr.title]="stopTitle()" [attr.aria-label]="stopTitle()" [class]="stopClass" [style]="touchBoxStyle()"><svg width="12" height="12" viewBox="0 0 12 12" style="display: block"><rect x="2" y="2" width="8" height="8" rx="1.5" fill="currentColor"></rect></svg></button>}<button type="button" data-mol-id="chat-send-button" (click)="onSend()" [attr.title]="sendTitle()" [attr.aria-label]="sendTitle()" [disabled]="!composer.hasInput() && popups.attachedFiles().length === 0" [class]="sendClass" [style]="touchBoxStyle()"><svg width="12" height="12" viewBox="0 0 12 12" style="display: block"><path d="M 2.5,6.5 L 6,3 L 9.5,6.5 M 6,3.5 L 6,10" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"></path></svg></button></div></div>`,
})
export class ChatComposerSection implements AfterViewInit {
  /** The shared panel state: the props the render reads. */
  private readonly state = inject(ChatInnerState)

  /** The composer slice: the live text, the draft and the textarea ref. */
  protected readonly composer = inject(ChatComposer)

  /** The input slice: the textarea's keystroke handler. */
  protected readonly input = inject(ChatInput)

  /** The attachments slice: the paste handler and the hidden file input. */
  protected readonly attachments = inject(ChatAttachments)

  /** The popups slice: the staged attachments the send button counts. */
  protected readonly popups = inject(ChatPopups)

  /** The chat slice: the mode, fast mode, the streaming flags and Stop. */
  protected readonly chat = inject(ChatChat)

  /** The pickers slice: whether the fast-mode toggle is offered. */
  private readonly pickers = inject(ChatPickers)

  /** The voice slice: whether dictation is listening, and its toggle. */
  protected readonly voice = inject(ChatVoice)

  /** The context-usage slice: the ring's sample, history and compactions. */
  protected readonly contextUsage = inject(ChatContextUsage)

  /** The render-handlers slice: the `@` and `/` glyphs, and the settings opener. */
  protected readonly handlers = inject(ChatRenderHandlers)

  /** The overlay slice: the context ring's settings action. */
  private readonly overlay = inject(ChatOverlay)

  /** The system-cards slice: the confirmation card a mode toggle publishes. */
  private readonly systemCards = inject(ChatSystemCards)

  /** The submit slice: the send button. */
  private readonly submit = inject(ChatSubmit)

  /** The timeline slice: whether the work tray is open above the composer. */
  private readonly timeline = inject(ChatTimeline)

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** The textarea element (published as the composer's ref once the view exists). */
  @ViewChild('ta') private ta?: ElementRef<HTMLTextAreaElement>

  /** The stop button's ClassMap classes. */
  protected readonly stopClass = this.cm.button({ variant: 'solid', color: 'error', size: 'xs' })

  /** The send button's ClassMap classes. */
  protected readonly sendClass = this.cm.button({ variant: 'solid', color: 'primary', size: 'xs' })

  /** Publishes the textarea element to the composer slice's ref. */
  ngAfterViewInit(): void {
    this.composer.textareaRef.current = this.ta?.nativeElement ?? null
  }

  /**
   * React's root `className`.
   * @returns The class string for the host element.
   */
  protected rootClass(): string {
    return this.cm.surfaceSecondary
  }

  /**
   * React's root `hidden` attribute (present only for a transcript view).
   * @returns The attribute value, or null.
   */
  protected hiddenAttr(): string | null {
    return this.state.env.transcriptOnly() ? '' : null
  }

  /**
   * React's `data-mol-viewer` marker (present only for a viewer).
   * @returns The attribute value, or null.
   */
  protected viewerAttr(): string | null {
    return this.canEdit() === false ? '' : null
  }

  /**
   * React's view-only capability (`canEdit !== false` renders the editing
   * affordances).
   * @returns The prop's value, `undefined` when unset.
   */
  protected canEdit(): boolean | undefined {
    return this.state.props().canEdit
  }

  /**
   * React's root style: the rounded top corners (all four while discovery is
   * centered), the padding, the text cursor, the raised stacking over an open
   * work tray and the view-only gold border.
   * @returns React's style object for the host element.
   */
  protected rootStyle(): StyleObject {
    const props = this.state.props()
    return {
      borderRadius: props.discovery ? '8px' : '8px 8px 0 0',
      padding: '8px 10px',
      cursor: 'text',
      ...(this.timeline.workVisible() ? { position: 'relative', zIndex: 1 } : {}),
      ...(props.canEdit === false ? { border: `1px solid ${NOTICE_TONE.gold.accent}` } : {}),
    }
  }

  /**
   * The textarea's inline style: edge-to-edge in its wrapper, borderless and
   * transparent, with the deliberate 16px iOS-zoom guard on touch-first
   * viewports.
   * @returns React's style object for the textarea.
   */
  protected textareaStyle(): StyleObject {
    return {
      width: '100%',
      display: 'block',
      padding: 0,
      color: 'inherit',
      resize: 'none',
      outline: 'none',
      border: 'none',
      background: 'transparent',
      fontFamily: 'inherit',
      overflowY: 'auto',
      scrollbarWidth: 'thin',
      boxSizing: 'border-box',
      ...(this.state.env.isNarrow() || this.state.env.isCoarse() ? { fontSize: '16px' } : {}),
    }
  }

  /**
   * The textarea's accessible name.
   * @returns The translated label.
   */
  protected inputLabel(): string {
    return this.state.env.t('ide.chat.inputLabel', undefined, {
      defaultValue: 'Write a message',
    })
  }

  /**
   * The textarea's placeholder: the viewer's team-chat prompt, else the send
   * prompt.
   * @returns The translated placeholder.
   */
  protected placeholder(): string {
    return this.canEdit() === false
      ? this.state.env.t('ide.chat.placeholderViewer', undefined, {
          defaultValue: 'Message your team',
        })
      : this.state.env.t('ide.chat.placeholder', undefined, { defaultValue: 'Send a message...' })
  }

  /**
   * Whether the fast-mode toggle renders (the mode's model offers the speed
   * tier).
   * @returns Whether the row is offered.
   */
  protected fastModeAvailable(): boolean {
    return this.pickers.fastModeAvailable()
  }

  /**
   * The context-usage sample the hint row shows, only for an editor.
   * @returns The usage to render, or null.
   */
  protected contextUsageForRow(): ContextUsage | null {
    if (this.canEdit() === false) return null
    return this.contextUsage.contextUsage()
  }

  /**
   * The project the ring's session totals load for.
   * @returns The project id.
   */
  protected projectId(): string {
    return this.state.props().projectId
  }

  /**
   * The conversation the ring belongs to.
   * @returns The conversation id, or null.
   */
  protected conversationId(): string | null {
    return this.state.env.conversationId()
  }

  /** Opens the settings overlay from the context ring. */
  protected readonly openSettings = (): void => {
    this.overlay.openPanelOverlay('settings')
  }

  /**
   * The mode toggle's style: the amber plan-mode chip (touch-first box grown
   * to 40×32), dimmed while the viewer cannot edit.
   * @returns React's style object for the mode toggle.
   */
  protected modeStyle(): StyleObject {
    const mode = this.chat.mode()
    const isLight = this.state.env.isLight()
    const isCoarse = this.state.env.isCoarse()
    const canEdit = this.canEdit()
    return {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: isCoarse ? '40px' : '24px',
      height: isCoarse ? '32px' : '24px',
      background:
        mode === 'plan' ? (isLight ? 'rgba(217,119,6,0.14)' : 'rgba(234,179,8,0.13)') : 'none',
      border:
        mode === 'plan'
          ? `1px solid ${isLight ? 'rgba(217,119,6,0.55)' : 'rgba(234,179,8,0.5)'}`
          : 'none',
      borderRadius: '3px',
      cursor: canEdit ? 'pointer' : 'not-allowed',
      color: mode === 'plan' ? (isLight ? '#d97706' : '#eab308') : 'inherit',
      opacity: !canEdit ? 0.4 : mode === 'plan' ? 1 : 0.4,
      padding: 0,
      transition: 'opacity 100ms, color 100ms',
    }
  }

  /**
   * The mode toggle's title (the action it performs).
   * @returns The translated title.
   */
  protected modeTitle(): string {
    return this.chat.mode() === 'plan'
      ? this.state.env.t('ide.chat.switchToExecute', undefined, {
          defaultValue: 'Switch to execute mode',
        })
      : this.state.env.t('ide.chat.switchToPlan', undefined, {
          defaultValue: 'Switch to plan mode',
        })
  }

  /**
   * The fast-mode toggle's style: the amber chip while on, dimmed while off.
   * @returns React's style object for the fast-mode toggle.
   */
  protected fastModeStyle(): StyleObject {
    const fastMode = this.chat.fastMode()
    const isLight = this.state.env.isLight()
    const isCoarse = this.state.env.isCoarse()
    return {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: isCoarse ? '40px' : '24px',
      height: isCoarse ? '32px' : '24px',
      background: fastMode ? (isLight ? 'rgba(217,119,6,0.14)' : 'rgba(234,179,8,0.13)') : 'none',
      border: fastMode
        ? `1px solid ${isLight ? 'rgba(217,119,6,0.55)' : 'rgba(234,179,8,0.5)'}`
        : 'none',
      borderRadius: '3px',
      cursor: 'pointer',
      color: fastMode ? (isLight ? '#d97706' : '#eab308') : 'inherit',
      opacity: fastMode ? 1 : 0.4,
      padding: 0,
      transition: 'opacity 100ms, color 100ms',
    }
  }

  /**
   * The fast-mode toggle's title (the action it performs).
   * @returns The translated title.
   */
  protected fastModeTitle(): string {
    return this.chat.fastMode()
      ? this.state.env.t('ide.chat.fastModeDisable', undefined, {
          defaultValue: 'Turn off fast mode',
        })
      : this.state.env.t('ide.chat.fastModeEnable', undefined, {
          defaultValue: 'Fast mode — up to 2.5× faster output at a higher token rate',
        })
  }

  /**
   * The mic button's style: red while listening, dimmed while idle.
   * @returns React's style object for the mic button.
   */
  protected micStyle(): StyleObject {
    const isListening = this.voice.isListening()
    const isCoarse = this.state.env.isCoarse()
    return {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: isCoarse ? '40px' : '24px',
      height: isCoarse ? '32px' : '24px',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: isListening ? 'rgb(239,68,68)' : 'inherit',
      opacity: isListening ? 1 : 0.4,
      padding: 0,
      borderRadius: '3px',
      transition: 'opacity 100ms, color 100ms',
    }
  }

  /**
   * The mic button's title (dictate, or stop dictation).
   * @returns The translated title.
   */
  protected micTitle(): string {
    return this.voice.isListening()
      ? this.state.env.t('ide.chat.voiceStop', undefined, { defaultValue: 'Stop dictation' })
      : this.state.env.t('ide.chat.voice', undefined, { defaultValue: 'Dictate' })
  }

  /**
   * The attach button's style (dimmed until hovered).
   * @returns React's style object for the attach button.
   */
  protected attachStyle(): StyleObject {
    const isCoarse = this.state.env.isCoarse()
    return {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: isCoarse ? '40px' : '24px',
      height: isCoarse ? '32px' : '24px',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'inherit',
      opacity: 0.4,
      padding: 0,
      borderRadius: '3px',
      transition: 'opacity 100ms',
    }
  }

  /**
   * The attach button's title.
   * @returns The translated title.
   */
  protected attachTitle(): string {
    return this.state.env.t('ide.chat.attachFile', undefined, { defaultValue: 'Attach file' })
  }

  /**
   * The `@` and `/` glyph buttons' style (the shared 24px / 40×32 box with a
   * 15px glyph).
   * @returns React's style object for a glyph button.
   */
  protected glyphStyle(): StyleObject {
    const isCoarse = this.state.env.isCoarse()
    return {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: isCoarse ? '40px' : '24px',
      height: isCoarse ? '32px' : '24px',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'inherit',
      opacity: 0.4,
      padding: 0,
      borderRadius: '3px',
      fontFamily: 'inherit',
      fontSize: '15px',
      lineHeight: 1,
      transition: 'opacity 100ms',
    }
  }

  /**
   * The `@` glyph's title.
   * @returns The translated title.
   */
  protected mentionTitle(): string {
    return this.state.env.t('ide.chat.mention', undefined, { defaultValue: 'Reference a file' })
  }

  /**
   * The `/` glyph's title.
   * @returns The translated title.
   */
  protected slashTitle(): string {
    return this.state.env.t('ide.chat.slashCommands', undefined, {
      defaultValue: 'Slash commands',
    })
  }

  /**
   * The stop/send cluster's style: the ring (when it renders) carries the
   * auto margin, otherwise this cluster does.
   * @returns React's style object for the cluster.
   */
  protected sendClusterStyle(): StyleObject {
    return {
      marginLeft: this.contextUsageForRow() ? '4px' : 'auto',
      display: 'flex',
      gap: '4px',
      alignItems: 'center',
    }
  }

  /**
   * The stop and send buttons' touch box (the one thing the ClassMap cannot
   * express): a flat 40×32 on coarse pointers.
   * @returns React's style object for the button, empty on fine pointers.
   */
  protected touchBoxStyle(): StyleObject {
    return this.state.env.isCoarse() ? { minWidth: '40px', minHeight: '32px' } : {}
  }

  /**
   * The stop button's title and aria-label.
   * @returns The translated text.
   */
  protected stopTitle(): string {
    return this.state.env.t('ide.chat.stop', undefined, { defaultValue: 'Stop' })
  }

  /**
   * The send button's title and aria-label.
   * @returns The translated text.
   */
  protected sendTitle(): string {
    return this.state.env.t('ide.chat.send', undefined, { defaultValue: 'Send' })
  }

  /** React's send handler: submits the composer's current content. */
  protected onSend(): void {
    void this.submit.handleSubmit()
  }

  /** React's mode toggle: flips plan/execute, persists it and announces the new mode. */
  protected toggleMode(): void {
    const mode = this.chat.mode()
    const newMode = mode === 'plan' ? 'execute' : 'plan'
    this.chat.setMode(newMode)
    this.state.env.http
      .patch(`/projects/${this.projectId()}/chat-mode`, {
        mode: newMode,
        conversationId: this.conversationId(),
      })
      .catch((error) => {
        logger.warn('chat-panel: persisting chat-mode toggle failed; reverted', {
          error,
        })
        this.chat.setMode(mode)
      })
    this.systemCards.addSystemCard(
      newMode === 'plan'
        ? this.state.env.t('ide.chat.switchedToPlan', undefined, {
            defaultValue: 'Switched to plan mode',
          })
        : this.state.env.t('ide.chat.switchedToExecute', undefined, {
            defaultValue: 'Switched to execute mode',
          }),
    )
  }

  /** React's fast-mode toggle: flips the speed tier, persists it and announces it. */
  protected toggleFastMode(): void {
    const fastMode = this.chat.fastMode()
    const next = !fastMode
    this.chat.setFastMode(next)
    this.state.env.http
      .patch(`/projects/${this.projectId()}/chat-mode`, {
        fastMode: next,
        conversationId: this.conversationId(),
      })
      .catch((error) => {
        logger.warn('chat-panel: persisting fast-mode toggle failed; reverted', {
          error,
        })
        this.chat.setFastMode(fastMode)
      })
    this.systemCards.addSystemCard(
      next
        ? this.state.env.t('ide.chat.fastModeOn', undefined, {
            defaultValue: 'Fast mode on — faster responses at a higher rate',
          })
        : this.state.env.t('ide.chat.fastModeOff', undefined, { defaultValue: 'Fast mode off' }),
    )
  }

  /**
   * React's container click: clicking anywhere but a button focuses the
   * textarea.
   * @param event - The click event.
   */
  protected onContainerClick(event: Event): void {
    if (!(event.target as HTMLElement).closest('button')) {
      this.composer.textareaRef.current?.focus()
    }
  }

  /**
   * The mode toggle's hover-in: brightens the chip when it is not already on.
   * @param event - The mouseenter event.
   */
  protected onModeEnter(event: Event): void {
    if (this.chat.mode() !== 'plan') (event.currentTarget as HTMLElement).style.opacity = '0.85'
  }

  /**
   * The mode toggle's hover-out: restores the dimmed opacity.
   * @param event - The mouseleave event.
   */
  protected onModeLeave(event: Event): void {
    if (this.chat.mode() !== 'plan') (event.currentTarget as HTMLElement).style.opacity = '0.4'
  }

  /**
   * The fast-mode toggle's hover-in: brightens the chip while off.
   * @param event - The mouseenter event.
   */
  protected onFastModeEnter(event: Event): void {
    if (!this.chat.fastMode()) (event.currentTarget as HTMLElement).style.opacity = '0.85'
  }

  /**
   * The fast-mode toggle's hover-out: restores the dimmed opacity.
   * @param event - The mouseleave event.
   */
  protected onFastModeLeave(event: Event): void {
    if (!this.chat.fastMode()) (event.currentTarget as HTMLElement).style.opacity = '0.4'
  }

  /**
   * The mic button's hover-in: brightens it while idle.
   * @param event - The mouseenter event.
   */
  protected onMicEnter(event: Event): void {
    if (!this.voice.isListening()) (event.currentTarget as HTMLElement).style.opacity = '0.85'
  }

  /**
   * The mic button's hover-out: restores the dimmed opacity.
   * @param event - The mouseleave event.
   */
  protected onMicLeave(event: Event): void {
    if (!this.voice.isListening()) (event.currentTarget as HTMLElement).style.opacity = '0.4'
  }

  /**
   * The attach button's hover-in: brightens it.
   * @param event - The mouseenter event.
   */
  protected onAttachEnter(event: Event): void {
    ;(event.currentTarget as HTMLElement).style.opacity = '0.85'
  }

  /**
   * The attach button's hover-out: restores the dimmed opacity.
   * @param event - The mouseleave event.
   */
  protected onAttachLeave(event: Event): void {
    ;(event.currentTarget as HTMLElement).style.opacity = '0.4'
  }

  /**
   * A glyph button's hover-in: brightens it.
   * @param event - The mouseenter event.
   */
  protected onGlyphEnter(event: Event): void {
    ;(event.currentTarget as HTMLElement).style.opacity = '0.85'
  }

  /**
   * A glyph button's hover-out: restores the dimmed opacity.
   * @param event - The mouseleave event.
   */
  protected onGlyphLeave(event: Event): void {
    ;(event.currentTarget as HTMLElement).style.opacity = '0.4'
  }
}
