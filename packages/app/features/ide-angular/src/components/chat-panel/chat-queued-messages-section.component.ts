/**
 * React's section “Queued messages — anchored above the composer” (ChatPanel.tsx
 * lines 7755–8018): the bar pinned over the composer holding the messages typed
 * while the agent works.
 *
 * React renders it only when something is queued and no popup above the composer
 * is open; otherwise the host — React's own root `<div>` — unwraps
 * (`data-parity-unwrap`, `display: contents`) so the port adds no node either
 * way. While shown the host IS the bar: the clock and the `{{count}} queued`
 * header, the capped scrolling list of single-line rows (truncated text with the
 * inline pencil / trash / send-now buttons and React's hover treatment), and the
 * inline editor a row opens into (its textarea, Enter/Escape handling and the
 * Cancel/Save pair).
 *
 * The row text, the open editor and its draft come from the `chat:queued-edit`
 * slice; the rows, the loading gate and the edit/delete/send actions from the
 * chat session; the bar's visibility from the composer, overlay and timeline
 * slices, exactly as React reads them in this render.
 *
 * @module
 */

import {
  afterNextRender,
  Component,
  type ElementRef,
  inject,
  Injector,
  ViewChild,
} from '@angular/core'

import type { ChatMessage } from '@molecule/app-ai-chat'
import type { UIClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import { Icon } from '../icon.component.js'
import { ChatChat } from './chat-chat.slice.js'
import { ChatComposer } from './chat-composer.slice.js'
import { ChatInnerState } from './chat-inner-state.js'
import { ChatOverlay } from './chat-overlay.slice.js'
import { ChatQueuedEdit } from './chat-queued-edit.slice.js'
import { ChatTimeline } from './chat-timeline.slice.js'

/** The bar's header row: the clock and the count. */
const HEADER_STYLE = styleText({ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 })

/** The clock's inline style. */
const CLOCK_STYLE = styleText({ opacity: 0.5, flexShrink: 0 })

/** The count's inline style. */
const COUNT_STYLE = styleText({ fontStyle: 'italic' })

/**
 * The capped list: many queued messages scroll in place instead of pushing the
 * composer down; single-line rows keep it tight.
 */
const LIST_STYLE = styleText({
  maxHeight: 132,
  overflowY: 'auto',
  scrollbarWidth: 'thin',
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
})

/** The editor's column: the textarea and its button row. */
const EDITOR_STYLE = styleText({ display: 'flex', flexDirection: 'column', gap: 6 })

/** The editor's button row. */
const EDITOR_ACTIONS_STYLE = styleText({ display: 'flex', gap: 6, justifyContent: 'flex-end' })

/** One queued row: the truncated text and its three icon buttons. */
const ROW_STYLE = styleText({ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 })

/** The row text: one line, truncated with an ellipsis. */
const ROW_TEXT_STYLE = styleText({
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  opacity: 0.8,
})

/** The send glyph's inline style (React's inline `<svg>`). */
const SEND_GLYPH_STYLE = 'display: block'

/** The closed state: React renders nothing, so the host unwraps to nothing. */
const UNWRAP_STYLE = styleText({ display: 'contents' })

/** The shown bar's inline chrome (React's outer `<div>`). */
const ROOT_STYLE = styleText({
  borderTop: '1px solid rgba(128,128,128,0.15)',
  padding: '6px 8px 6px 10px',
})

/**
 * React's “Queued messages — anchored above the composer” section: the pinned
 * bar, or nothing while nothing is queued or a popup is open.
 */
@Component({
  selector: 'div[mol-chat-queued-messages-section]',
  standalone: true,
  imports: [Icon],
  host: {
    '[attr.data-parity-unwrap]': 'closed() ? "" : null',
    '[attr.style]': 'closed() ? unwrapStyle : rootStyle',
  },
  // prettier-ignore
  template: `@if (!closed()) {<div [attr.style]="headerStyle"><svg mol-icon [name]="'clock'" [size]="clockSize" aria-hidden="true" [attr.style]="clockStyle"></svg><span [attr.class]="countClass" [attr.style]="countStyle">{{ countText() }}</span></div><div [attr.style]="listStyle">@for (qm of queuedMessages(); track qm.id) {@if (editingQueuedId() === qm.id) {<div [attr.style]="editorStyle"><textarea #queuedEditor [defaultValue]="editingQueuedText()" (input)="onEditorInput($event)" (keydown)="onEditorKeydown($event, qm)" [attr.aria-label]="editorLabel()" [attr.class]="editorClass" [attr.style]="editorTextareaStyle()"></textarea><div [attr.style]="editorActionsStyle"><button type="button" data-mol-id="chat-queued-edit-cancel" (click)="cancel()" [attr.class]="cancelClass">{{ cancelText() }}</button><button type="button" data-mol-id="chat-queued-edit-save" (click)="save(qm)" [attr.class]="saveClass">{{ saveText() }}</button></div></div>} @else {<div [attr.style]="rowStyle"><span [attr.title]="qm.content" [attr.class]="rowTextClass" [attr.style]="rowTextStyle">{{ qm.content }}</span><button type="button" [attr.title]="editTitle()" (click)="startEditing(qm)" [attr.style]="iconButtonStyle(editColor, 0.5)" (mouseenter)="hoverEdit($event, true)" (mouseleave)="hoverEdit($event, false)"><svg mol-icon [name]="'pencil'" [size]="iconSize" aria-hidden="true"></svg></button><button type="button" [attr.title]="deleteTitle()" (click)="remove(qm)" [attr.style]="deleteButtonStyle()" (mouseenter)="hoverDelete($event, true)" (mouseleave)="hoverDelete($event, false)"><svg mol-icon [name]="'trash'" [size]="iconSize" aria-hidden="true"></svg></button>@if (!isLoading()) {<button type="button" [attr.title]="sendTitle()" (click)="sendNow(qm)" [attr.style]="sendButtonStyle()" (mouseenter)="hoverSend($event, true)" (mouseleave)="hoverSend($event, false)"><svg width="13" height="13" viewBox="0 0 12 12" [attr.style]="sendGlyphStyle"><path d="M 2.5,6.5 L 6,3 L 9.5,6.5 M 6,3.5 L 6,10" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"></path></svg></button>}</div>}}</div>}`,
})
export class ChatQueuedMessagesSection {
  /** The shared state, read for the env (the ClassMap, the theme, the pointer and `t`). */
  private readonly state = inject(ChatInnerState)

  /** The timeline slice: the messages still waiting in the queue. */
  private readonly timeline = inject(ChatTimeline)

  /** The chat session: the rows' actions and the loading gate. */
  private readonly chat = inject(ChatChat)

  /** The composer slice: the popups that hide the bar. */
  private readonly composer = inject(ChatComposer)

  /** The overlay slice: a panel overlay hides the bar too. */
  private readonly overlay = inject(ChatOverlay)

  /** The queued-edit slice: the row under edit and its draft. */
  private readonly edit = inject(ChatQueuedEdit)

  /** The component injector, for the after-render focus move. */
  private readonly injector = inject(Injector)

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap

  /** The bar's header row inline layout. */
  protected readonly headerStyle: string | null = HEADER_STYLE

  /** The clock's inline style. */
  protected readonly clockStyle: string | null = CLOCK_STYLE

  /** The count's inline style. */
  protected readonly countStyle: string | null = COUNT_STYLE

  /** The capped list's inline layout. */
  protected readonly listStyle: string | null = LIST_STYLE

  /** The editor's column layout. */
  protected readonly editorStyle: string | null = EDITOR_STYLE

  /** The editor's button row. */
  protected readonly editorActionsStyle: string | null = EDITOR_ACTIONS_STYLE

  /** One queued row's inline layout. */
  protected readonly rowStyle: string | null = ROW_STYLE

  /** The row text's inline style. */
  protected readonly rowTextStyle: string | null = ROW_TEXT_STYLE

  /** The send glyph's inline style. */
  protected readonly sendGlyphStyle: string | null = SEND_GLYPH_STYLE

  /** The shown bar's inline chrome. */
  protected readonly rootStyle: string | null = ROOT_STYLE

  /** The closed state's inline style (the host unwraps away). */
  protected readonly unwrapStyle: string | null = UNWRAP_STYLE

  /** The clock glyph's size (React's `size={11}`). */
  protected readonly clockSize = 11

  /** The row buttons' glyph size (React's `size={13}`). */
  protected readonly iconSize = 13

  /** The count span's ClassMap classes. */
  protected readonly countClass: string

  /** The editor textarea's ClassMap classes. */
  protected readonly editorClass: string

  /** The row text's ClassMap classes. */
  protected readonly rowTextClass: string

  /** The Cancel button's ClassMap classes. */
  protected readonly cancelClass: string

  /** The Save button's ClassMap classes. */
  protected readonly saveClass: string

  /** The edit button's resting colour (React's `color: 'inherit'`). */
  protected readonly editColor = 'inherit'

  /** The queued rows, as the timeline derives them. */
  protected readonly queuedMessages = this.timeline.queuedMessages

  /** The row under edit, or null. */
  protected readonly editingQueuedId = this.edit.editingQueuedId

  /** The editor's current draft. */
  protected readonly editingQueuedText = this.edit.editingQueuedText

  /** Whether this client's own turn streams (the send-now button hides then). */
  protected readonly isLoading = this.chat.isLoading

  /**
   * The editor's textarea, kept in the queued-edit slice so the slice's focus
   * effect reaches it the way React's `ref={queuedEditRef}` does.
   */
  @ViewChild('queuedEditor')
  private set queuedEditor(ref: ElementRef<HTMLTextAreaElement> | undefined) {
    this.edit.queuedEditRef.current = ref?.nativeElement ?? null
  }

  /** Resolves the ClassMap and the static classes once, at construction. */
  constructor() {
    this.cm = this.state.env.cm
    this.countClass = this.cm.cn(this.cm.textMuted, this.cm.textSize('xs'))
    this.editorClass = this.cm.cn(this.cm.surface, this.cm.textSize('sm'))
    this.rowTextClass = this.cm.textSize('sm')
    this.cancelClass = this.cm.cn(
      this.cm.button({ variant: 'solid', color: 'secondary', size: 'xs' }),
      this.cm.touchTargetCompact,
    )
    this.saveClass = this.cm.cn(
      this.cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
      this.cm.touchTargetCompact,
    )
  }

  /**
   * Whether React would render nothing: nothing queued, or a popup above the
   * composer is open.
   *
   * @returns Whether the bar is closed.
   */
  protected closed(): boolean {
    return (
      this.queuedMessages().length === 0 ||
      this.composer.commandMenu() !== null ||
      this.composer.modelPicker() !== null ||
      this.composer.effortPicker() !== null ||
      this.overlay.panelOverlay() !== null
    )
  }

  /**
   * The header's count line.
   *
   * @returns The translated `{{count}} queued` text.
   */
  protected countText(): string {
    // Follows a locale switch, the way React's whole-component re-render does.
    void this.state.env.locale()
    return this.state.env.t(
      'ide.chat.queuedCount',
      { count: this.queuedMessages().length },
      { defaultValue: '{{count}} queued' },
    )
  }

  /**
   * The editor textarea's accessible name.
   *
   * @returns The translated label.
   */
  protected editorLabel(): string {
    void this.state.env.locale()
    return this.state.env.t('ide.chat.queuedEdit.label', undefined, {
      defaultValue: 'Edit queued message',
    })
  }

  /**
   * The Cancel button's label.
   *
   * @returns The translated text.
   */
  protected cancelText(): string {
    void this.state.env.locale()
    return this.state.env.t('common.cancel', undefined, { defaultValue: 'Cancel' })
  }

  /**
   * The Save button's label.
   *
   * @returns The translated text.
   */
  protected saveText(): string {
    void this.state.env.locale()
    return this.state.env.t('common.save', undefined, { defaultValue: 'Save' })
  }

  /**
   * The edit button's title.
   *
   * @returns The translated text.
   */
  protected editTitle(): string {
    void this.state.env.locale()
    return this.state.env.t('ide.chat.editQueued', undefined, { defaultValue: 'Edit' })
  }

  /**
   * The delete button's title.
   *
   * @returns The translated text.
   */
  protected deleteTitle(): string {
    void this.state.env.locale()
    return this.state.env.t('ide.chat.deleteQueued', undefined, { defaultValue: 'Delete' })
  }

  /**
   * The send-now button's title.
   *
   * @returns The translated text.
   */
  protected sendTitle(): string {
    void this.state.env.locale()
    return this.state.env.t('ide.chat.sendQueued', undefined, { defaultValue: 'Send' })
  }

  /**
   * The editor textarea's inline style: the theme's border colour changes with
   * the theme, so it is computed at render.
   *
   * @returns The style attribute text.
   */
  protected editorTextareaStyle(): string | null {
    return styleText({
      width: '100%',
      minHeight: '52px',
      padding: '6px 8px',
      border: `1px solid ${this.state.env.isLight() ? '#d1d9e0' : 'rgba(255,255,255,0.1)'}`,
      borderRadius: '6px',
      resize: 'vertical',
      color: 'inherit',
      fontFamily: 'inherit',
    })
  }

  /**
   * One row icon button's inline style (React's object: a fixed square that
   * grows on a coarse pointer).
   *
   * @param color - The button's colour token/value.
   * @param opacity - Its resting opacity.
   * @returns The style attribute text.
   */
  protected iconButtonStyle(color: string, opacity: number): string | null {
    const size = this.state.env.isCoarse() ? 32 : 22
    return styleText({
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: size,
      height: size,
      flexShrink: 0,
      border: 'none',
      borderRadius: 4,
      background: 'none',
      color,
      opacity,
      cursor: 'pointer',
      padding: 0,
      transition: 'opacity 100ms, background 100ms',
    })
  }

  /**
   * The delete button's inline style (the theme's error token).
   *
   * @returns The style attribute text.
   */
  protected deleteButtonStyle(): string | null {
    return this.iconButtonStyle('var(--mol-color-error, #dc2626)', 0.6)
  }

  /**
   * The send-now button's inline style (the theme's success token).
   *
   * @returns The style attribute text.
   */
  protected sendButtonStyle(): string | null {
    return this.iconButtonStyle('var(--mol-color-success, #16a34a)', 0.7)
  }

  /**
   * Handles one `input` event from the editor's textarea (React's `onChange`).
   *
   * @param event - The native input event.
   */
  protected onEditorInput(event: Event): void {
    this.edit.setEditingQueuedText((event.target as HTMLTextAreaElement).value)
  }

  /**
   * Handles the editor's keydown: Enter saves, Escape cancels (React's handler).
   *
   * @param event - The native keydown event.
   * @param qm - The row being edited.
   */
  protected onEditorKeydown(event: KeyboardEvent, qm: ChatMessage): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      this.save(qm)
    }
    if (event.key === 'Escape') this.edit.setEditingQueuedId(null)
  }

  /**
   * Opens the row's editor seeded with its text (React's edit click).
   *
   * @param qm - The row to edit.
   */
  protected startEditing(qm: ChatMessage): void {
    this.edit.setEditingQueuedId(qm.id)
    this.edit.setEditingQueuedText(qm.content)
    // The editor mounts with this update; move focus into it once it exists,
    // which is React's focus effect running after the commit.
    afterNextRender(() => this.edit.queuedEditRef.current?.focus(), { injector: this.injector })
  }

  /** Closes the editor without saving (React's Cancel). */
  protected cancel(): void {
    this.edit.setEditingQueuedId(null)
  }

  /**
   * Saves the draft: an emptied draft deletes the row; either way the editor
   * closes (React's Save and Enter path).
   *
   * @param qm - The row being edited.
   */
  protected save(qm: ChatMessage): void {
    const trimmed = this.edit.editingQueuedText().trim()
    if (trimmed) this.chat.editQueuedMessage(qm.id, trimmed)
    else this.chat.deleteQueuedMessage(qm.id)
    this.edit.setEditingQueuedId(null)
  }

  /**
   * Deletes a queued row through the session (React's trash click).
   *
   * @param qm - The row to delete.
   */
  protected remove(qm: ChatMessage): void {
    this.chat.deleteQueuedMessage(qm.id)
  }

  /**
   * Deletes the row and sends its content at once (React's send-now click).
   *
   * @param qm - The row to send.
   */
  protected sendNow(qm: ChatMessage): void {
    const content = qm.content
    this.chat.deleteQueuedMessage(qm.id)
    void this.chat.sendMessage(content)
  }

  /**
   * The edit button's hover treatment (React's `onMouseEnter`).
   *
   * @param event - The native mouse event.
   * @param over - Whether the pointer entered (else left).
   */
  protected hoverEdit(event: MouseEvent, over: boolean): void {
    const el = event.currentTarget as HTMLElement
    el.style.opacity = over ? '1' : '0.5'
    el.style.background = over ? 'rgba(128,128,128,0.15)' : 'none'
  }

  /**
   * The delete button's hover treatment (React's `onMouseEnter`).
   *
   * @param event - The native mouse event.
   * @param over - Whether the pointer entered (else left).
   */
  protected hoverDelete(event: MouseEvent, over: boolean): void {
    const el = event.currentTarget as HTMLElement
    el.style.opacity = over ? '1' : '0.6'
    el.style.background = over
      ? 'color-mix(in srgb, var(--mol-color-error, #dc2626) 12%, transparent)'
      : 'none'
  }

  /**
   * The send button's hover treatment (React's `onMouseEnter`).
   *
   * @param event - The native mouse event.
   * @param over - Whether the pointer entered (else left).
   */
  protected hoverSend(event: MouseEvent, over: boolean): void {
    const el = event.currentTarget as HTMLElement
    el.style.opacity = over ? '1' : '0.7'
    el.style.background = over
      ? 'color-mix(in srgb, var(--mol-color-success, #16a34a) 14%, transparent)'
      : 'none'
  }
}
