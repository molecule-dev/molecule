/**
 * React's render section “── Header: conversation selector” of ChatPanel.tsx:
 * the row above the chat that names the open conversation and opens the
 * history dropdown, with the share, bug-report, settings and new-chat buttons.
 *
 * Angular counterpart of that section: the same inputs (React's prop names —
 * the conversation list, the open id, the dropdown state and the search text)
 * and the same callback names, the same DOM for the same input, the same
 * ClassMap classes and inline styles, and the same direct hover mutations. The
 * host element IS React's root `<div>`, so the port adds no node.
 *
 * The focus-into-search and close-on-outside-click effects React declares in
 * the outer panel belong to this element: this component owns the two element
 * references (React's `convSearchRef` and the root the outside click tests),
 * focuses the search field after the render that opens the dropdown, and keeps
 * the document `mousedown` listener attached exactly while the dropdown is
 * open.
 *
 * @module
 */

import {
  afterEveryRender,
  type AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  type OnChanges,
  type SimpleChanges,
  ViewChild,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import { relativeTime } from '@molecule/app-ide-panel-logic'
import type { ConversationSummary } from '@molecule/app-ide-panel-logic/panels'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import { useCoarsePointer, useNarrowViewport } from '../../hooks/useViewport.js'
import { Icon } from '../icon.component.js'

/** The header's inputs — React's `ChatPanel` state and callbacks for the row. */
export interface ChatHeaderProps {
  /** The known conversations (unfiltered): the title reads the open one from here. */
  conversations: readonly ConversationSummary[]
  /** The conversations the dropdown lists (filtered by the search). */
  filteredConversations: readonly ConversationSummary[]
  /** The open conversation's id, when there is one. */
  activeConversationId: string | null
  /** Whether the history dropdown is open. */
  showDropdown: boolean
  /** The dropdown's search text. */
  convSearch: string
  /** Whether the user may create a conversation (React's `canEdit`). */
  canEdit: boolean
  /** Whether the share surfaces are available to this viewer. */
  shareAllowed: boolean
  /** Opens or closes the dropdown, refetching when it opens. */
  onToggle: () => void
  /** Starts a new conversation. */
  onNewChat: () => void
  /** Opens one conversation. */
  onSelect: (id: string) => void
  /** Applies the dropdown's search text. */
  onSearch: (value: string) => void
  /** Bumps the host's open-share signal. */
  onOpenShare: () => void
  /** Bumps the host's open-report signal. */
  onOpenReport: () => void
  /** Bumps the host's open-settings signal. */
  onOpenSettings: () => void
  /** Closes the dropdown (the outside click). */
  onClose: () => void
}

/**
 * The conversation-selector header: title trigger, history dropdown and the
 * share / report / settings / new-chat buttons.
 */
@Component({
  selector: 'div[mol-chat-header]',
  standalone: true,
  imports: [Icon],
  inputs: [
    'conversations',
    'filteredConversations',
    'activeConversationId',
    'showDropdown',
    'convSearch',
    'canEdit',
    'shareAllowed',
    'onToggle',
    'onNewChat',
    'onSelect',
    'onSearch',
    'onOpenShare',
    'onOpenReport',
    'onOpenSettings',
    'onClose',
  ],
  host: {
    '[class]': 'rootClass()',
    '[attr.style]': 'rootStyle()',
  },
  // prettier-ignore
  template: `<button type="button" data-mol-id="chat-conversation-toggle" (click)="onToggle()" [class]="toggleClass" [attr.style]="s.trigger" (mouseenter)="onTriggerEnter($event)" (mouseleave)="onTriggerLeave($event)"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" [attr.style]="chevronStyle()"><polyline points="6,4 10,8 6,12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></polyline></svg><span [attr.style]="s.label">{{ labelText() }}</span></button>@if (shareAllowed) {<button type="button" data-mol-id="chat-share-button" (click)="onOpenShare()" [class]="iconButtonClass" [attr.title]="shareTitle()" [attr.aria-label]="shareTitle()" [attr.style]="s.iconButton"><svg mol-icon [name]="'share'" [size]="14" aria-hidden="true"></svg></button>}<button type="button" data-mol-id="chat-report-button" (click)="onOpenReport()" [class]="iconButtonClass" [attr.title]="reportTitle()" [attr.aria-label]="reportTitle()" [attr.style]="s.iconButton"><svg mol-icon [name]="'bug'" [size]="14" aria-hidden="true"></svg></button><button type="button" data-mol-id="chat-settings-button" (click)="onOpenSettings()" [class]="iconButtonClass" [attr.title]="settingsTitle()" [attr.aria-label]="settingsTitle()" [attr.style]="s.iconButton"><svg mol-icon [name]="'gear'" [size]="14" aria-hidden="true"></svg></button>@if (canEdit !== false) {<button type="button" data-mol-id="chat-new-conversation" (click)="onNewChat()" [class]="newChatClass" [attr.title]="newChatTitle()" [attr.style]="s.newChat">+</button>}@if (showDropdown) {<div [class]="cm.cn(cm.surface, cm.borderAll)" [attr.style]="dropdownStyle()"><div [attr.style]="s.searchWrap" [class]="cm.surface"><input #searchInput [value]="convSearch" [attr.value]="convSearch" (input)="onSearchInput($event)" [attr.placeholder]="searchPlaceholder()" [class]="cm.textSize('xs')" [attr.style]="searchStyle()" /></div>@if (filteredConversations.length === 0) {<div [class]="cm.cn(cm.textMuted, cm.textSize('xs'))" [attr.style]="s.empty">{{ emptyLabel() }}</div>}@for (conversation of filteredConversations; track conversation.id) {<button type="button" [attr.data-mol-id]="'chat-conversation-' + conversation.id" (click)="onSelect(conversation.id)" [class]="rowClass(conversation)" (mouseenter)="onRowEnter($event)" (mouseleave)="onRowLeave($event)" [attr.style]="s.row"><span [class]="cm.textSize('xs')" [attr.style]="s.rowLabel">{{ previewOf(conversation) }}</span><span [class]="cm.cn(cm.textMuted, cm.textSize('xs'))" [attr.style]="s.rowTime">{{ timeOf(conversation) }}</span></button>}</div>}`,
})
export class ChatHeader implements OnChanges, AfterViewInit {
  /** The known conversations (unfiltered). */
  conversations: readonly ConversationSummary[] = []

  /** The conversations the dropdown lists (filtered by the search). */
  filteredConversations: readonly ConversationSummary[] = []

  /** The open conversation's id, when there is one. */
  activeConversationId: string | null = null

  /** Whether the history dropdown is open. */
  showDropdown = false

  /** The dropdown's search text. */
  convSearch = ''

  /** Whether the user may create a conversation (React's `canEdit`). */
  canEdit = true

  /** Whether the share surfaces are available to this viewer. */
  shareAllowed = false

  /** Opens or closes the dropdown, refetching when it opens. */
  onToggle: () => void = () => {}

  /** Starts a new conversation. */
  onNewChat: () => void = () => {}

  /** Opens one conversation. */
  onSelect: (id: string) => void = () => {}

  /** Applies the dropdown's search text. */
  onSearch: (value: string) => void = () => {}

  /** Bumps the host's open-share signal. */
  onOpenShare: () => void = () => {}

  /** Bumps the host's open-report signal. */
  onOpenReport: () => void = () => {}

  /** Bumps the host's open-settings signal. */
  onOpenSettings: () => void = () => {}

  /** Closes the dropdown (the outside click). */
  onClose: () => void = () => {}

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** Reactive translation, read in the injection context. */
  private readonly i18n = useTranslation()

  /** Whether the viewport is phone-width (its dropdown cap grows and the search field does). */
  private readonly isNarrow = useNarrowViewport()

  /** Whether the primary pointer is coarse (the header grows to fit its touch targets). */
  private readonly isCoarse = useCoarsePointer()

  /** The static style texts. */
  protected readonly s = STYLES

  /** The trigger's class list (React computes it once per render). */
  protected readonly toggleClass = this.cm.cn(this.cm.textSize('xs'), this.cm.textMuted)

  /** The share / report / settings buttons' class list. */
  protected readonly iconButtonClass = this.cm.cn(
    this.cm.button({ variant: 'ghost', size: 'xs' }),
    this.cm.touchTarget,
  )

  /** The new-chat button's class list. */
  protected readonly newChatClass = this.cm.cn(
    this.cm.button({ variant: 'ghost', size: 'xs' }),
    this.cm.touchTarget,
  )

  /** React's root `dropdownRef`: the element the outside click is measured against. */
  private readonly dropdownRef: { current: HTMLElement | null } = { current: null }

  /** Whether the document `mousedown` listener is attached right now. */
  private listening = false

  /** Whether the next render should move focus into the search field. */
  private focusPending = false

  /** The dropdown's search field (React's `convSearchRef`). */
  @ViewChild('searchInput') private searchInput?: ElementRef<HTMLInputElement>

  /** The host element: React's root div, whose extent decides an inside click. */
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef)

  /** Registers the after-render focus pass and the listener teardown. */
  constructor() {
    afterEveryRender(() => {
      if (!this.focusPending) return
      const input = this.searchInput?.nativeElement
      if (!input) return
      this.focusPending = false
      input.focus()
    })
    inject(DestroyRef).onDestroy(() => this.stopListening())
  }

  /**
   * React's root ref is committed after the first render.
   */
  ngAfterViewInit(): void {
    this.dropdownRef.current = this.host.nativeElement
  }

  /**
   * React's two `showDropdown` effects: focus the search field when the
   * dropdown opens, and keep the outside-click listener attached while it is
   * open.
   * @param changes - The inputs that changed since the previous pass.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['showDropdown']) return
    if (this.showDropdown) this.focusPending = true
    this.syncListener()
  }

  /**
   * React's root `className`.
   * @returns The class string for the host element.
   */
  protected rootClass(): string {
    return this.cm.cn(
      this.cm.flex({ direction: 'row', align: 'center', justify: 'between' }),
      this.cm.sp('px', 2),
      this.cm.shrink0,
      this.cm.borderB,
    )
  }

  /**
   * React's root style: relative, a fixed 33px on fine pointers, and taller on
   * touch so the header buttons keep their touch target.
   * @returns The style attribute text.
   */
  protected rootStyle(): string | null {
    return styleText({
      position: 'relative',
      height: this.isCoarse() ? undefined : '33px',
      minHeight: '33px',
      zIndex: 10,
    })
  }

  /**
   * The disclosure chevron's rotation.
   * @returns The style attribute text.
   */
  protected chevronStyle(): string | null {
    return styleText({
      display: 'block',
      flexShrink: 0,
      opacity: 0.5,
      transform: this.showDropdown ? 'rotate(90deg)' : 'rotate(0deg)',
      transition: 'transform 100ms',
    })
  }

  /**
   * The history dropdown's placement and cap (dvh on phones).
   * @returns The style attribute text.
   */
  protected dropdownStyle(): string | null {
    return styleText({
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      zIndex: 100,
      maxHeight: this.isNarrow() ? 'min(50dvh, 420px)' : '280px',
      overflowY: 'auto',
      scrollbarWidth: 'thin',
      borderRadius: '0 0 6px 6px',
      boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
    })
  }

  /**
   * The search field's style: transparent, with the deliberate iOS-zoom guard
   * (16px) on phones overriding `cm.textSize('xs')`.
   * @returns The style attribute text.
   */
  protected searchStyle(): string | null {
    return styleText({
      width: '100%',
      background: 'transparent',
      border: 'none',
      outline: 'none',
      color: 'inherit',
      ...(this.isNarrow() ? { fontSize: 16 } : {}),
    })
  }

  /**
   * The trigger's label: the open conversation's preview, else the history
   * fallback.
   * @returns The label text.
   */
  protected labelText(): string {
    const active = this.conversations.find(
      (conversation) => conversation.id === this.activeConversationId,
    )
    return (
      active?.preview ??
      this.i18n.t('ide.chat.historyFallback', undefined, { defaultValue: 'Chat history' })
    )
  }

  /**
   * The search placeholder.
   * @returns The translated placeholder.
   */
  protected searchPlaceholder(): string {
    return this.i18n.t('ide.chat.searchConversations', undefined, {
      defaultValue: 'Search conversations…',
    })
  }

  /**
   * The empty list's label.
   * @returns The translated label.
   */
  protected emptyLabel(): string {
    return this.i18n.t('ide.chat.noConversations', undefined, {
      defaultValue: 'No conversations yet',
    })
  }

  /**
   * A row's preview.
   * @param conversation - The row.
   * @returns The preview, else the new-conversation label.
   */
  protected previewOf(conversation: ConversationSummary): string {
    return (
      conversation.preview ??
      this.i18n.t('ide.chat.newConversation', undefined, { defaultValue: 'New conversation' })
    )
  }

  /**
   * A row's relative update time.
   * @param conversation - The row.
   * @returns The relative time text.
   */
  protected timeOf(conversation: ConversationSummary): string {
    return relativeTime(conversation.updatedAt)
  }

  /**
   * A row's class list (the open conversation gets the secondary surface).
   * @param conversation - The row.
   * @returns The class string.
   */
  protected rowClass(conversation: ConversationSummary): string {
    return this.cm.cn(
      this.cm.w('full'),
      conversation.id === this.activeConversationId ? this.cm.surfaceSecondary : '',
    )
  }

  /**
   * The share button's title and aria-label.
   * @returns The translated text.
   */
  protected shareTitle(): string {
    return this.i18n.t('ide.chat.share.openShare', undefined, { defaultValue: 'Share project' })
  }

  /**
   * The report button's title and aria-label.
   * @returns The translated text.
   */
  protected reportTitle(): string {
    return this.i18n.t('ide.chat.report.openReport', undefined, { defaultValue: 'Report a bug' })
  }

  /**
   * The settings button's title and aria-label.
   * @returns The translated text.
   */
  protected settingsTitle(): string {
    return this.i18n.t('ide.chat.openSettings', undefined, { defaultValue: 'Settings' })
  }

  /**
   * The new-chat button's title.
   * @returns The translated text.
   */
  protected newChatTitle(): string {
    return this.i18n.t('ide.chat.newChat', undefined, { defaultValue: 'New chat' })
  }

  /**
   * Typing in the dropdown's search field.
   * @param event - The input event.
   */
  protected onSearchInput(event: Event): void {
    this.onSearch((event.target as HTMLInputElement).value)
  }

  /**
   * React's trigger hover: reveals the title's label (a direct DOM write, not
   * state).
   * @param event - The mouseenter event.
   */
  protected onTriggerEnter(event: Event): void {
    const span = (event.currentTarget as HTMLElement).querySelector('span')
    if (span) span.style.opacity = '1'
  }

  /**
   * React's trigger hover-out: restores the title's label opacity (a direct
   * DOM write, not state).
   * @param event - The mouseleave event.
   */
  protected onTriggerLeave(event: Event): void {
    const span = (event.currentTarget as HTMLElement).querySelector('span')
    if (span) span.style.opacity = '0.7'
  }

  /**
   * React's row hover: tints the row (a direct DOM write, not state).
   * @param event - The mouseenter event.
   */
  protected onRowEnter(event: Event): void {
    ;(event.currentTarget as HTMLElement).style.background = 'rgba(128,128,128,0.1)'
  }

  /**
   * React's row hover-out: clears the row tint (a direct DOM write, not state).
   * @param event - The mouseleave event.
   */
  protected onRowLeave(event: Event): void {
    ;(event.currentTarget as HTMLElement).style.background = ''
  }

  /** React's outside-click handler: a mousedown outside the header closes the dropdown. */
  private readonly onDocumentMouseDown = (event: MouseEvent): void => {
    const root = this.dropdownRef.current
    if (root && !root.contains(event.target as Node)) this.onClose()
  }

  /** Attaches or detaches the document listener to match React's effect. */
  private syncListener(): void {
    if (this.showDropdown) this.startListening()
    else this.stopListening()
  }

  /** Attaches the document `mousedown` listener once. */
  private startListening(): void {
    if (this.listening) return
    document.addEventListener('mousedown', this.onDocumentMouseDown)
    this.listening = true
  }

  /** Detaches the document `mousedown` listener, when attached. */
  private stopListening(): void {
    if (!this.listening) return
    document.removeEventListener('mousedown', this.onDocumentMouseDown)
    this.listening = false
  }
}

/**
 * The header's inline-style texts that never change, serialized once with
 * `styleText` (React's camelCase numbers become `px` exactly the way React
 * writes them; the conformance normalizer sorts declarations, so key order is
 * free).
 */
const STYLES = {
  /** The conversation trigger's layout. */
  trigger: styleText({
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: 'inherit',
    padding: '6px 6px 6px 0',
    textAlign: 'left',
    overflow: 'hidden',
    borderRadius: '4px',
  }),
  /** The trigger label's truncation. */
  label: styleText({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    opacity: 0.7,
  }),
  /** A header icon button's placement in the row. */
  iconButton: styleText({ flexShrink: 0, display: 'inline-flex', alignItems: 'center' }),
  /** The new-chat button's placement in the row. */
  newChat: styleText({ flexShrink: 0 }),
  /** The search row's chrome. */
  searchWrap: styleText({
    padding: '6px 10px',
    borderBottom: '1px solid rgba(128,128,128,0.12)',
    position: 'sticky',
    top: 0,
  }),
  /** The empty list's padding. */
  empty: styleText({ padding: '10px 12px' }),
  /** One conversation row's layout. */
  row: styleText({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '2px',
    padding: '8px 12px',
    border: 'none',
    cursor: 'pointer',
    color: 'inherit',
    textAlign: 'left',
  }),
  /** The row preview's truncation. */
  rowLabel: styleText({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    width: '100%',
  }),
  /** The row's relative time. */
  rowTime: styleText({ opacity: 0.55 }),
} as const
