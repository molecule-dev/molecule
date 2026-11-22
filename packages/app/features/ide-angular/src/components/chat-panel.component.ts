/**
 * React's `ChatPanel` (ChatPanel.tsx lines 8883–9437): the outer shell — the
 * conversation-selector header, the report and share modal slots, and the
 * inner chat surface remounted per conversation.
 *
 * The component owns React's conversation state: the internal active id and
 * remount key (seeded from `localStorage`), the dropdown, the fetched list and
 * its search, and the three host-signal counters the header's buttons bump.
 * Host-controlled props (`conversationId`, `chatKey`, `onConversationId`,
 * `open*Signal`) override the internal state the way React's `??` and
 * `!== undefined` switches do, and the resolved facts are threaded into
 * `ChatInner`: the endpoint carries the open conversation's id, `canShare` is
 * the resolved capability, and the modal/settings signals are the effective
 * counters.
 *
 * The mount fetch of the conversation list (`GET /projects/:id/conversations`,
 * skipped when the host renders its own chrome) runs in `ngAfterViewInit`,
 * which Angular orders child-before-parent, so it is the panel's LAST mount
 * call exactly as React's effect order makes it.
 *
 * The host element `<div mol-chat-panel>` is React's own root element: React's
 * `cm.cn(cm.flex({ direction: 'col' }), cm.h('full'), cm.surface, cm.borderR,
 * className)` classes live on it through a host binding, so nothing is added
 * to the DOM.
 *
 * @module
 */

import type { SimpleChanges, TemplateRef } from '@angular/core'
import { type AfterViewInit, Component, type OnChanges, type OnInit, signal } from '@angular/core'

import { DEFAULT_AGENT_NAME, DEFAULT_PRODUCT_NAME, useHttpClient } from '@molecule/app-angular'
import type { CommandDef } from '@molecule/app-ide-panel-logic'
import type { ConversationSummary } from '@molecule/app-ide-panel-logic/panels'
import { chatConversationStorageKey } from '@molecule/app-ide-panel-logic/panels'
import { getClassMap } from '@molecule/app-ui'

import { ChatHeader } from './chat-panel/chat-header.component.js'
import { ChatInner } from './chat-panel/chat-inner.component.js'
import type { ChatInnerProps, ChatNativeTests } from './chat-panel/chat-inner-state.js'

/**
 * React's `ChatPanelProps`: the outer panel's props, in React's names and
 * order. It is `ChatInnerProps` (with `endpoint` optional — React derives
 * `/projects/:projectId/chat` when it is missing) plus the outer-only
 * conversation-control and modal props.
 */
export type ChatPanelProps = Omit<ChatInnerProps, 'endpoint'> & {
  /** The chat endpoint; defaults to `/projects/:id/chat`. */
  endpoint?: string
  /** Hide the conversation-selector header. */
  hideConversationMenu?: boolean
  /** Whether to render the built-in conversation header (defaults to `true`). */
  renderConversationHeader?: boolean
  /** Host-controlled active conversation id (headless mode). */
  conversationId?: string | null
  /** Host-controlled remount key for the inner chat (headless mode). */
  chatKey?: string
  /** Called whenever the active conversation id changes. */
  onConversationId?: (id: string | null) => void
  /** Changing this opens the in-chat `/share` modal. */
  openShareSignal?: number
  /** Changing this opens the in-chat `/report` modal. */
  openReportSignal?: number
  /** Spinner/busy indicator node for in-chat loading states. */
  spinner?: TemplateRef<unknown>
  /**
   * Retained for call-site compatibility; React no longer reads it (guest
   * reminders arrive as a host-emitted `custom` stream event).
   */
  suppressGuestReminder?: boolean
  /** Extra classes merged onto React's root element. */
  className?: string
}

/**
 * The AI chat panel: React's outer shell (conversation header + modals) with
 * the inner chat surface beneath it.
 */
@Component({
  selector: 'div[mol-chat-panel]',
  standalone: true,
  imports: [ChatHeader, ChatInner],
  inputs: [
    'projectId',
    'endpoint',
    'initialMessage',
    'onInitialMessageSent',
    'activeFile',
    'openTabs',
    'onFileOpen',
    'onFileDoubleClick',
    'onFileDiff',
    'onFileRevert',
    'onFileChange',
    'onFileDeleted',
    'onCommit',
    'onActivityClick',
    'onRenderError',
    'onProfileClick',
    'currentUserId',
    'onReadyToBuild',
    'awaitingSandboxBoot',
    'onClientAction',
    'onTurnComplete',
    'onLoadingChange',
    'onNavigatePreview',
    'onRegisterPushHandler',
    'onRegisterHistoryReconcile',
    'autoSubmitSignal',
    'initialInputValue',
    'hideConversationMenu',
    'renderConversationHeader',
    'conversationId',
    'chatKey',
    'onConversationId',
    'openShareSignal',
    'openReportSignal',
    'openSettingsSignal',
    'modelSelectionSignal',
    'onManageCustomModels',
    'gitStatusTick',
    'pendingMessage',
    'pendingMessageKey',
    'pendingMessageSuppressUser',
    'pendingMessageUserInitiated',
    'userEditedFile',
    'userEditedFileKey',
    'isPro',
    'isAnonymous',
    'canEdit',
    'canSendTeamMessages',
    'canShare',
    'shareLinksAllowed',
    'shareLinksRefreshSignal',
    'shareModalContent',
    'buildUpgradeCta',
    'buildHelpUpgradeSection',
    'userAvatar',
    'agentName',
    'productName',
    'version',
    'extraCommands',
    'feedbackUrl',
    'listTests',
    'runTests',
    'watchTestRuns',
    'nativeTests',
    'canRunTests',
    'testsAvailable',
    'skipToolCall',
    'spinner',
    'suppressGuestReminder',
    'className',
  ],
  host: {
    '[class]': 'rootClass()',
  },
  // prettier-ignore
  template: `@if (renderConversationHeader !== false && !hideConversationMenu) {<div mol-chat-header [conversations]="conversations()" [filteredConversations]="filteredConvs()" [activeConversationId]="activeConversationId()" [showDropdown]="showDropdown()" [convSearch]="convSearch()" [canEdit]="canEditAllowed()" [shareAllowed]="shareAllowed()" [onToggle]="handleToggleDropdown" [onNewChat]="handleNewChat" [onSelect]="handleSelectConversation" [onSearch]="handleConvSearch" [onOpenShare]="bumpShareSignal" [onOpenReport]="bumpReportSignal" [onOpenSettings]="bumpSettingsSignal" [onClose]="closeDropdown"></div>}@for (k of [activeChatKey()]; track k) {<div mol-chat-inner [projectId]="projectId" [endpoint]="chatEndpoint()" [initialMessage]="initialMessage" [onInitialMessageSent]="onInitialMessageSent" [isPro]="isPro" [isAnonymous]="isAnonymous" [canEdit]="canEditAllowed()" [canSendTeamMessages]="canSendTeamMessagesAllowed()" [canShare]="shareAllowed()" [shareLinksAllowed]="shareLinksAllowed" [shareLinksRefreshSignal]="shareLinksRefreshSignal" [shareModalContent]="shareModalContent" [buildUpgradeCta]="buildUpgradeCta" [buildHelpUpgradeSection]="buildHelpUpgradeSection" [activeFile]="activeFile" [openTabs]="openTabs" [onFileOpen]="onFileOpen" [onFileDoubleClick]="onFileDoubleClick" [onFileDiff]="onFileDiff" [onFileRevert]="onFileRevert" [onFileChange]="onFileChange" [onFileDeleted]="onFileDeleted" [onCommit]="onCommit" [onConversationId]="reportConversationId" [onActivityClick]="onActivityClick" [onRenderError]="onRenderError" [onProfileClick]="onProfileClick" [currentUserId]="currentUserId" [onReadyToBuild]="onReadyToBuild" [awaitingSandboxBoot]="awaitingSandboxBoot" [onClientAction]="onClientAction" [onTurnComplete]="onTurnComplete" [onLoadingChange]="onLoadingChange" [onNavigatePreview]="onNavigatePreview" [onRegisterPushHandler]="onRegisterPushHandler" [onRegisterHistoryReconcile]="onRegisterHistoryReconcile" [autoSubmitSignal]="autoSubmitSignal" [openSettingsSignal]="effectiveSettingsSignal()" [onManageCustomModels]="onManageCustomModels" [modelSelectionSignal]="modelSelectionSignal" [openReportSignal]="effectiveReportSignal()" [openShareSignal]="effectiveShareSignal()" [initialInputValue]="initialInputValue" [pendingMessage]="pendingMessage" [pendingMessageKey]="pendingMessageKey" [pendingMessageSuppressUser]="pendingMessageSuppressUser" [pendingMessageUserInitiated]="pendingMessageUserInitiated" [userEditedFile]="userEditedFile" [userEditedFileKey]="userEditedFileKey" [gitStatusTick]="gitStatusTick" [discovery]="hideConversationMenu" [userAvatar]="userAvatar" [agentName]="agentNameResolved()" [productName]="productNameResolved()" [version]="version" [extraCommands]="extraCommands" [feedbackUrl]="feedbackUrl" [listTests]="listTests" [runTests]="runTests" [watchTestRuns]="watchTestRuns" [nativeTests]="nativeTests" [canRunTests]="canRunTests" [testsAvailable]="testsAvailable" [skipToolCall]="skipToolCall"></div>}`,
})
export class ChatPanel implements OnInit, OnChanges, AfterViewInit {
  /** The project the conversation belongs to. */
  projectId = ''

  /** The chat endpoint; defaults to `/projects/:id/chat`. */
  endpoint?: string

  /** Auto-send this message once on mount. */
  initialMessage?: string

  /** Called after the initial message has been sent. */
  onInitialMessageSent?: () => void

  /** Path of the currently focused file in the editor. */
  activeFile?: string | null

  /** Paths of all open editor tabs. */
  openTabs?: string[]

  /** Opens a file as a preview tab. */
  onFileOpen?: ChatInnerProps['onFileOpen']

  /** Pins a tab when a filename in a tool call is double-clicked. */
  onFileDoubleClick?: ChatInnerProps['onFileDoubleClick']

  /** Opens a changed file's diff view. */
  onFileDiff?: ChatInnerProps['onFileDiff']

  /** Undoes or redoes a file change by writing the given content. */
  onFileRevert?: ChatInnerProps['onFileRevert']

  /** Called when the AI creates or modifies a file. */
  onFileChange?: ChatInnerProps['onFileChange']

  /** Called when a file is removed from disk. */
  onFileDeleted?: ChatInnerProps['onFileDeleted']

  /** Called after a commit or no-op. */
  onCommit?: () => void

  /** Called when an inline activity card is clicked. */
  onActivityClick?: ChatInnerProps['onActivityClick']

  /** Reports a timeline item that threw during render. */
  onRenderError?: ChatInnerProps['onRenderError']

  /** Called when a user avatar or author name in the timeline is clicked. */
  onProfileClick?: ChatInnerProps['onProfileClick']

  /** The signed-in user's id. */
  currentUserId?: string

  /** Called on the `ready_to_build` stream event. */
  onReadyToBuild?: () => void

  /** True after the plan streams while the sandbox is still booting. */
  awaitingSandboxBoot?: boolean

  /** Called on the `client_action` stream event. */
  onClientAction?: ChatInnerProps['onClientAction']

  /** Called on each stream done/error. */
  onTurnComplete?: () => void

  /** Called when the chat's loading state changes. */
  onLoadingChange?: (loading: boolean) => void

  /** Navigates the preview to a route path on a chat link click. */
  onNavigatePreview?: (path: string) => void

  /** Registers the broadcast-chat-event handler with the host. */
  onRegisterPushHandler?: ChatInnerProps['onRegisterPushHandler']

  /** Registers the history reconcile with the host. */
  onRegisterHistoryReconcile?: ChatInnerProps['onRegisterHistoryReconcile']

  /** Changing this value submits the current input draft. */
  autoSubmitSignal?: number

  /** Seeds the input with this text on mount. */
  initialInputValue?: string

  /** Hide the conversation-selector header (e.g. during discovery). */
  hideConversationMenu?: boolean

  /** Whether to render the built-in conversation header (React's default `true`). */
  renderConversationHeader = true

  /** Host-controlled active conversation id (headless mode). */
  conversationId?: string | null

  /** Host-controlled remount key for the inner chat (headless mode). */
  chatKey?: string

  /** Called whenever the active conversation id changes. */
  onConversationId?: (id: string | null) => void

  /** Changing this opens the in-chat `/share` modal. */
  openShareSignal?: number

  /** Changing this opens the in-chat `/report` modal. */
  openReportSignal?: number

  /** Changing this opens the in-chat `/settings` view. */
  openSettingsSignal?: number

  /** Bump to re-read persisted model/settings. */
  modelSelectionSignal?: number

  /** Shows a "manage your own models" row in the `/model` picker. */
  onManageCustomModels?: ChatInnerProps['onManageCustomModels']

  /** Incremented to trigger a git status refresh. */
  gitStatusTick?: number

  /** Message to auto-send when `pendingMessageKey` changes. */
  pendingMessage?: string

  /** Incremented to trigger sending `pendingMessage`. */
  pendingMessageKey?: number

  /** Sends the pending message on the user's behalf without a user bubble. */
  pendingMessageSuppressUser?: boolean

  /** Marks the pending message as directly user-requested. */
  pendingMessageUserInitiated?: boolean

  /** File path the user just edited in the editor. */
  userEditedFile?: string

  /** Incremented to trigger the user-edit check. */
  userEditedFileKey?: number

  /** Whether the user has a paid plan. */
  isPro?: boolean

  /** Whether the viewer is anonymous. */
  isAnonymous?: boolean

  /** Whether the user may write shared project state (React's default `true`). */
  canEdit = true

  /** Whether team messages are allowed (React's default `true`). */
  canSendTeamMessages = true

  /** Whether the user may manage public share links. */
  canShare?: boolean

  /** Whether the share dialog shows its links. */
  shareLinksAllowed?: boolean

  /** Re-fetches the share dialog's links. */
  shareLinksRefreshSignal?: number

  /** Host sections rendered inside the share dialog. */
  shareModalContent?: TemplateRef<unknown>

  /** Host-supplied upgrade/sign-in CTA builder. */
  buildUpgradeCta?: ChatInnerProps['buildUpgradeCta']

  /** Host-supplied `/help` upgrade section builder. */
  buildHelpUpgradeSection?: ChatInnerProps['buildHelpUpgradeSection']

  /** The signed-in user's profile avatar. */
  userAvatar?: string | null

  /** Display name of the AI coding agent (React's default `the assistant`). */
  agentName: string = DEFAULT_AGENT_NAME

  /** Display name of the host product / IDE (React's default `the IDE`). */
  productName: string = DEFAULT_PRODUCT_NAME

  /** The host's current app/build version. */
  version?: string

  /** Host-specific slash commands merged into the menu. */
  extraCommands?: readonly CommandDef[]

  /** Command-menu "Report a problem" URL. */
  feedbackUrl?: string

  /** Lists the project's tests for the Tests bar. */
  listTests?: ChatInnerProps['listTests']

  /** Runs the selected tests, streaming events. */
  runTests?: ChatInnerProps['runTests']

  /** Subscribes to every test run in the project. */
  watchTestRuns?: ChatInnerProps['watchTestRuns']

  /** Host-owned durable native runs in the Tests browser and composer strip. */
  nativeTests?: ChatNativeTests

  /** Whether this viewer may run tests. */
  canRunTests?: boolean

  /** Whether the environment the tests run in is up. */
  testsAvailable?: boolean

  /** Skips the executor's running tool call without ending the turn. */
  skipToolCall?: ChatInnerProps['skipToolCall']

  /** Spinner/busy indicator node for in-chat loading states. */
  spinner?: TemplateRef<unknown>

  /** Retained for call-site compatibility; React no longer reads it. */
  suppressGuestReminder?: boolean

  /** Extra classes merged onto React's root element. */
  className?: string

  /** The bonded ClassMap (styling tokens resolve at render time). */
  private readonly cm = getClassMap()

  /** The bond's HTTP client (the conversation list reads and creates). */
  private readonly http = useHttpClient()

  /** React's `internalActiveConversationId` (the uncontrolled mode). */
  private readonly internalActiveConversationId = signal<string | null>(null)

  /**
   * React's `internalChatKey`: changes only on a user-initiated switch, so a
   * server-assigned id updates the endpoint without remounting `ChatInner`.
   */
  private readonly internalChatKey = signal('default')

  /** Whether the history dropdown is open. */
  private readonly showDropdown = signal(false)

  /** The fetched conversation list. */
  private readonly conversations = signal<ConversationSummary[]>([])

  /** The dropdown's search text. */
  private readonly convSearch = signal('')

  /** The header's open-settings counter (host-controlled prop wins). */
  private readonly internalOpenSettingsSignal = signal(0)

  /** The header's open-report counter (host-controlled prop wins). */
  private readonly internalOpenReportSignal = signal(0)

  /** The header's open-share counter (host-controlled prop wins). */
  private readonly internalOpenShareSignal = signal(0)

  /**
   * Seeds the uncontrolled state from `localStorage` (React's `useState`
   * initializers): the saved conversation id, then the remount key derived
   * from the same key.
   */
  ngOnInit(): void {
    const storageKey = chatConversationStorageKey(this.projectId)
    this.internalActiveConversationId.set(localStorage.getItem(storageKey))
    this.internalChatKey.set(localStorage.getItem(storageKey) ?? 'default')
  }

  /**
   * Re-reads the conversation list when the project changes, the way React's
   * `fetchConversations` callback (its dependency) re-runs its mount effect.
   *
   * React runs the inner chat's effects before the outer panel's in one commit
   * (child first), so the request must land AFTER the remounted inner chat's
   * model, settings, git and file requests. Angular's render-phase effects run
   * before this component's own, so the fetch is deferred by one microtask —
   * queued behind the current tick's synchronous requests and ahead of their
   * promise continuations.
   *
   * @param changes - The bound input changes.
   */
  ngOnChanges(changes: SimpleChanges): void {
    const project = changes['projectId']
    if (!project || project.firstChange || project.previousValue === project.currentValue) return
    if (this.renderConversationHeader === false) return
    queueMicrotask(() => {
      void this.fetchConversations()
    })
  }

  /**
   * The outer mount: React fetches the conversation list here unless the host
   * renders its own chrome, which is why its request is the LAST mount call
   * (Angular runs a child's `ngAfterViewInit` before its parent's).
   */
  ngAfterViewInit(): void {
    if (this.renderConversationHeader === false) return
    void this.fetchConversations()
  }

  /**
   * React's root `className`: the flex column surface, full height, with the
   * host's extra classes.
   * @returns The resolved class string for the host element.
   */
  protected rootClass(): string {
    return this.cm.cn(
      this.cm.flex({ direction: 'col' }),
      this.cm.h('full'),
      this.cm.surface,
      this.cm.borderR,
      this.className,
    )
  }

  /**
   * React's `isConversationControlled`: whether the host drives the active id
   * (`conversationId !== undefined`; `null` is a valid controlled value).
   * @returns Whether the host owns the active conversation id.
   */
  protected isConversationControlled(): boolean {
    return this.conversationId !== undefined
  }

  /**
   * React's `activeConversationId`: the host's value when controlled, else the
   * localStorage-backed internal one.
   * @returns The active conversation id, or null.
   */
  protected activeConversationId(): string | null {
    return this.isConversationControlled()
      ? (this.conversationId ?? null)
      : this.internalActiveConversationId()
  }

  /**
   * React's `chatKey`: the host's remount key when given, else the internal
   * one that only a user-initiated switch changes.
   * @returns The key `ChatInner` is remounted on.
   */
  protected activeChatKey(): string {
    return this.chatKey ?? this.internalChatKey()
  }

  /**
   * React's `effectiveSettingsSignal`: the host's counter when given, else the
   * header's bump.
   * @returns The open-settings counter.
   */
  protected effectiveSettingsSignal(): number {
    return this.openSettingsSignal ?? this.internalOpenSettingsSignal()
  }

  /**
   * React's `effectiveReportSignal`: the host's counter when given, else the
   * header's bump.
   * @returns The open-report counter.
   */
  protected effectiveReportSignal(): number {
    return this.openReportSignal ?? this.internalOpenReportSignal()
  }

  /**
   * React's `effectiveShareSignal`: the host's counter when given, else the
   * header's bump.
   * @returns The open-share counter.
   */
  protected effectiveShareSignal(): number {
    return this.openShareSignal ?? this.internalOpenShareSignal()
  }

  /**
   * React's `shareAllowed`: share management may be gated above `canEdit`.
   * @returns Whether the share surfaces are available to this viewer.
   */
  protected shareAllowed(): boolean {
    return this.canShare ?? this.canEdit !== false
  }

  /**
   * React's `canEdit = true` default: undefined means an editor.
   * @returns Whether the viewer may write shared project state.
   */
  protected canEditAllowed(): boolean {
    return this.canEdit !== false
  }

  /**
   * React's `canSendTeamMessages = true` default.
   * @returns Whether team messages are allowed.
   */
  protected canSendTeamMessagesAllowed(): boolean {
    return this.canSendTeamMessages !== false
  }

  /**
   * React's `agentName` as `ChatInner` resolves it: the prop, else the neutral
   * default.
   * @returns The agent display name.
   */
  protected agentNameResolved(): string {
    return this.agentName ?? DEFAULT_AGENT_NAME
  }

  /**
   * React's `productName` as `ChatInner` resolves it: the prop, else the
   * neutral default.
   * @returns The product display name.
   */
  protected productNameResolved(): string {
    return this.productName ?? DEFAULT_PRODUCT_NAME
  }

  /**
   * React's `chatEndpoint`: the host's endpoint (else `/projects/:id/chat`),
   * carrying the open conversation's id.
   * @returns The endpoint the inner chat loads.
   */
  protected chatEndpoint(): string {
    const base = this.endpoint ?? `/projects/${this.projectId}/chat`
    const id = this.activeConversationId()
    return id ? `${base}?conversationId=${id}` : base
  }

  /**
   * React's `filteredConvs`: the list narrowed by the search text (React
   * filters on the preview, case-insensitively).
   * @returns The conversations the dropdown lists.
   */
  protected filteredConvs(): ConversationSummary[] {
    const query = this.convSearch()
    const all = this.conversations()
    return query
      ? all.filter((conversation) =>
          conversation.preview?.toLowerCase().includes(query.toLowerCase()),
        )
      : all
  }

  /**
   * React's `handleToggleDropdown`: flips the dropdown, refetching the list on
   * the opening flip.
   */
  protected readonly handleToggleDropdown = (): void => {
    const open = this.showDropdown()
    if (!open) void this.fetchConversations()
    this.showDropdown.set(!open)
  }

  /** React's `handleNewChat` (the click does not await its async body). */
  protected readonly handleNewChat = (): void => {
    void this.startNewChat()
  }

  /**
   * React's `handleSelectConversation`: opens the conversation (which remounts
   * the inner chat), remembers it and closes the dropdown.
   * @param id - The conversation's id.
   */
  protected readonly handleSelectConversation = (id: string): void => {
    this.persistConversationId(id)
    this.internalChatKey.set(id)
    this.showDropdown.set(false)
    this.convSearch.set('')
  }

  /**
   * React's dropdown search input.
   * @param value - The field's current text.
   */
  protected readonly handleConvSearch = (value: string): void => {
    this.convSearch.set(value)
  }

  /** React's outside click on the header: closes the dropdown. */
  protected readonly closeDropdown = (): void => {
    this.showDropdown.set(false)
  }

  /** The share button's click: bumps the (effective) open-share counter. */
  protected readonly bumpShareSignal = (): void => {
    this.internalOpenShareSignal.update((value) => value + 1)
  }

  /** The bug-report button's click: bumps the (effective) open-report counter. */
  protected readonly bumpReportSignal = (): void => {
    this.internalOpenReportSignal.update((value) => value + 1)
  }

  /** The settings button's click: bumps the (effective) open-settings counter. */
  protected readonly bumpSettingsSignal = (): void => {
    this.internalOpenSettingsSignal.update((value) => value + 1)
  }

  /**
   * React's `reportConversationId`: what `ChatInner` reports a
   * (backend-assigned or switched) conversation id to — the host's handler in
   * controlled mode, else the localStorage-backed persist.
   * @param id - The conversation id the inner chat reports.
   */
  protected readonly reportConversationId = (id: string): void => {
    const handler = this.onConversationId
    if (handler) handler(id)
    else this.persistConversationId(id)
  }

  /**
   * React's `persistConversationId`: records the active id in state and
   * `localStorage` (removing it when there is none).
   * @param id - The conversation id, or null.
   */
  private readonly persistConversationId = (id: string | null): void => {
    this.internalActiveConversationId.set(id)
    if (id) localStorage.setItem(chatConversationStorageKey(this.projectId), id)
    else localStorage.removeItem(chatConversationStorageKey(this.projectId))
  }

  /**
   * React's `fetchConversations`: reads the project's conversation list. The
   * list is display-only, so a failed fetch is swallowed with its reason.
   */
  private async fetchConversations(): Promise<void> {
    try {
      const res = await this.http.get<{ conversations: ConversationSummary[] }>(
        `/projects/${this.projectId}/conversations`,
      )
      this.conversations.set(res.data.conversations)
    } catch (_error) {
      // Non-critical: the list only labels the header and fills the dropdown,
      // and both work without it — React ignores this failure the same way.
    }
  }

  /**
   * React's `handleNewChat`: creates a conversation on the server and remounts
   * the inner chat onto it; a failed create falls back to a client-side key so
   * the user can still start a new chat.
   */
  private async startNewChat(): Promise<void> {
    try {
      const res = await this.http.post<{ id: string }>(
        `/projects/${this.projectId}/conversations`,
        {},
      )
      this.persistConversationId(res.data.id)
      this.internalChatKey.set(res.data.id)
    } catch (_error) {
      // The create failed: fall back to a local key so a new chat can still
      // start, without a persisted conversation id. React does the same.
      this.persistConversationId(null)
      this.internalChatKey.set(`new-${Date.now()}`)
    }
    this.showDropdown.set(false)
    this.convSearch.set('')
  }
}
